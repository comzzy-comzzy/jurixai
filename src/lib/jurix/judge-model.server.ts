import type {
  HackathonSummary,
  JudgeAgent,
  JudgingCriterion,
  SubmissionSummary,
} from "@/lib/jurix/types";

export type AgentEvaluation = {
  score: number;
  confidence: number;
  rationale: string;
  evidence: string[];
  flags: string[];
};

type JudgeModelConfig = {
  provider: "openai" | "minimax" | "openai_compat";
  apiKey: string;
  model: string;
  baseUrl: string;
};

type RepoContext = {
  summary: string;
  evidence: string[];
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function optional(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "Not provided";
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

function parseGitHubRepo(url: string | null): { owner: string; repo: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    return {
      owner: segments[0],
      repo: segments[1].replace(/\.git$/i, ""),
    };
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "jurixai-judge-bot",
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github.raw+json",
      "user-agent": "jurixai-judge-bot",
    },
  });

  if (!response.ok) return null;
  return await response.text();
}

async function loadRepoContext(githubUrl: string | null): Promise<RepoContext | null> {
  const repoRef = parseGitHubRepo(githubUrl);
  if (!repoRef) return null;

  const repoMeta = await fetchJson<{
    full_name?: string;
    default_branch?: string;
    stargazers_count?: number;
    open_issues_count?: number;
    description?: string | null;
    language?: string | null;
  }>(`https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}`);

  const rootEntries = await fetchJson<Array<{ name?: string; type?: string }>>(
    `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/contents`,
  );

  const readme = await fetchText(
    `https://raw.githubusercontent.com/${repoRef.owner}/${repoRef.repo}/${repoMeta?.default_branch ?? "main"}/README.md`,
  );

  const packageJson = await fetchText(
    `https://raw.githubusercontent.com/${repoRef.owner}/${repoRef.repo}/${repoMeta?.default_branch ?? "main"}/package.json`,
  );

  const evidence: string[] = [];
  if (repoMeta?.full_name) evidence.push(`Repository: ${repoMeta.full_name}`);
  if (repoMeta?.language) evidence.push(`Primary language: ${repoMeta.language}`);
  if (rootEntries?.length) {
    evidence.push(
      `Root entries: ${rootEntries
        .slice(0, 8)
        .map((entry) => `${entry.name ?? "unknown"} (${entry.type ?? "unknown"})`)
        .join(", ")}`,
    );
  }
  if (readme?.trim()) {
    evidence.push(`README present (${readme.trim().split(/\r?\n/).length} lines)`);
  } else {
    evidence.push("README missing or unreadable");
  }
  if (packageJson?.trim()) {
    evidence.push("package.json present");
  }

  const summaryLines = [
    repoMeta?.description ? `Repo description: ${repoMeta.description}` : null,
    repoMeta?.language ? `Primary language: ${repoMeta.language}` : null,
    rootEntries?.length
      ? `Root files: ${rootEntries
          .slice(0, 12)
          .map((entry) => entry.name ?? "unknown")
          .join(", ")}`
      : "Root files unavailable.",
    readme?.trim() ? `README excerpt: ${truncate(readme.trim().replace(/\s+/g, " "), 1800)}` : null,
    packageJson?.trim()
      ? `package.json excerpt: ${truncate(packageJson.trim().replace(/\s+/g, " "), 1200)}`
      : null,
  ].filter(Boolean);

  return {
    summary: summaryLines.join("\n"),
    evidence: evidence.slice(0, 5),
  };
}

export function hasJudgeModelConfig(): boolean {
  return Boolean(process.env.JURIX_JUDGE_API_KEY?.trim() && process.env.JURIX_JUDGE_MODEL?.trim());
}

function getJudgeModelConfig(): JudgeModelConfig {
  const rawProvider = process.env.JURIX_JUDGE_PROVIDER?.trim().toLowerCase();
  const provider =
    rawProvider === "minimax"
      ? "minimax"
      : rawProvider === "openai_compat"
        ? "openai_compat"
        : "openai";
  return {
    provider,
    apiKey: required("JURIX_JUDGE_API_KEY"),
    model: required("JURIX_JUDGE_MODEL"),
    baseUrl:
      process.env.JURIX_JUDGE_BASE_URL?.trim() ||
      (provider === "minimax"
        ? "https://api.minimaxi.chat/v1"
        : provider === "openai_compat"
          ? "https://router-api.0g.ai/v1"
          : "https://api.openai.com/v1"),
  };
}

function buildSystemPrompt(agent: JudgeAgent, criterion: JudgingCriterion): string {
  return [
    "You are an autonomous hackathon judge.",
    `Judge identity: ${agent.name} (${agent.role}).`,
    `Focus area: ${agent.focus_area}.`,
    `Stored system prompt: ${agent.system_prompt ?? "Not provided"}.`,
    `Stored scoring notes: ${agent.scoring_notes ?? "Not provided"}.`,
    `Criterion name: ${criterion.name}.`,
    `Criterion description: ${criterion.description ?? "Not provided"}.`,
    `Criterion weight percent: ${criterion.weight_percent}.`,
    "Score only what is supported by the submission data you receive.",
    "Do not invent repo contents, demo behavior, users, metrics, or implementation details.",
    "You must consider whether the project followed the host brief, rules, and required deliverables.",
    "If the project appears off-brief or misses required deliverables, state that directly in the rationale and flags.",
    "Use a 1.00 to 10.00 score scale.",
    "Return exactly 5 lines and nothing else.",
    "Do not use markdown fences.",
    "Keep the rationale under 320 characters.",
    "Keep evidence entries short and concrete.",
  ].join("\n");
}

function buildUserPrompt(
  hackathon: HackathonSummary,
  submission: SubmissionSummary,
  repoContext: RepoContext | null,
): string {
  return [
    "Evaluate this submission against the assigned criterion.",
    "",
    `Hackathon name: ${hackathon.name}`,
    `Hackathon brief: ${optional(hackathon.description)}`,
    `Submission instructions: ${optional(hackathon.submission_instructions)}`,
    `Required deliverables: ${
      hackathon.required_deliverables.length > 0
        ? hackathon.required_deliverables.join("; ")
        : "Not provided"
    }`,
    "",
    `Project name: ${submission.project_name}`,
    `Team name: ${submission.team_name}`,
    `Description: ${optional(submission.description)}`,
    `GitHub URL: ${optional(submission.github_url)}`,
    `Demo URL: ${optional(submission.demo_url)}`,
    `Video URL: ${optional(submission.video_url)}`,
    `Payout address: ${submission.payout_address}`,
    `Entry paid: ${submission.entry_paid ? "yes" : "no"}`,
    `Community votes: ${submission.community_votes}`,
    `Submission status: ${submission.status}`,
    `Public repo inspection: ${repoContext ? "available" : "not available"}`,
    repoContext ? repoContext.summary : "Repo inspection summary: Not available.",
    "",
    "Return exactly these 5 lines:",
    "SCORE: <number 1-10>",
    "CONFIDENCE: <number 0-1>",
    "RATIONALE: <one short sentence>",
    "EVIDENCE: <item 1>; <item 2>; <item 3>",
    "FLAGS: <flag1>, <flag2>, <flag3>",
    "",
    "Rules:",
    '- "score" must be between 1 and 10.',
    '- "confidence" must be between 0 and 1.',
    '- "rationale" must be specific to this project, criterion, and host brief, and 320 characters or fewer.',
    '- "evidence" must contain at most 3 short observations from the provided hackathon, submission fields, and repo inspection only.',
    '- "flags" should contain short machine-readable labels such as missing_repo, missing_demo, off_brief, missing_deliverable, weak_docs, weak_repo_structure, weak_readme, low_evidence, entry_unpaid.',
    '- If there are no flags, write "FLAGS: none".',
  ].join("\n");
}

function stripReasoningPreamble(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function normalizeStringArray(value: string): string[] {
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function validateEvaluation(raw: string): AgentEvaluation {
  const text = stripReasoningPreamble(raw);
  const fields = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z]+)\s*:\s*(.*)\s*$/);
    if (match) fields.set(match[1], match[2]);
  }

  const score = clamp(Number(fields.get("SCORE")), 1, 10);
  const confidence = clamp(Number(fields.get("CONFIDENCE")), 0, 1);
  const rationale = fields.get("RATIONALE")?.trim() ?? "";
  const evidence = normalizeStringArray(fields.get("EVIDENCE") ?? "");
  const flagsRaw = fields.get("FLAGS")?.trim() ?? "";
  const flags = !flagsRaw || /^none$/i.test(flagsRaw) ? [] : normalizeStringArray(flagsRaw);

  if (!Number.isFinite(score)) {
    throw new Error("Judge model returned an invalid score.");
  }

  if (!Number.isFinite(confidence)) {
    throw new Error("Judge model returned an invalid confidence.");
  }

  if (!rationale) {
    throw new Error("Judge model returned an empty rationale.");
  }

  return {
    score: Number(score.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    rationale,
    evidence,
    flags,
  };
}

export async function evaluateSubmissionWithModel(
  agent: JudgeAgent,
  criterion: JudgingCriterion,
  hackathon: HackathonSummary,
  submission: SubmissionSummary,
): Promise<AgentEvaluation> {
  const repoContext = await loadRepoContext(submission.github_url);
  const config = getJudgeModelConfig();
  const body =
    config.provider === "minimax" || config.provider === "openai_compat"
      ? {
          model: config.model,
          messages: [
            { role: "system", content: buildSystemPrompt(agent, criterion) },
            { role: "user", content: buildUserPrompt(hackathon, submission, repoContext) },
          ],
          temperature: 0.2,
          max_tokens: 420,
        }
      : {
          model: config.model,
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: buildSystemPrompt(agent, criterion) }],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: buildUserPrompt(hackathon, submission, repoContext),
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "jurixai_judge_evaluation",
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["score", "confidence", "rationale", "evidence", "flags"],
                properties: {
                  score: { type: "number", minimum: 1, maximum: 10 },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  rationale: { type: "string", minLength: 1, maxLength: 1200 },
                  evidence: {
                    type: "array",
                    items: { type: "string", minLength: 1, maxLength: 240 },
                    maxItems: 6,
                  },
                  flags: {
                    type: "array",
                    items: { type: "string", minLength: 1, maxLength: 64 },
                    maxItems: 6,
                  },
                },
              },
            },
          },
        };

  const endpoint =
    config.provider === "minimax" || config.provider === "openai_compat"
      ? `${config.baseUrl.replace(/\/$/, "")}/text/chatcompletion_v2`
      : `${config.baseUrl.replace(/\/$/, "")}/responses`;

  const finalEndpoint =
    config.provider === "openai_compat"
      ? `${config.baseUrl.replace(/\/$/, "")}/chat/completions`
      : endpoint;

  const response = await fetch(finalEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Judge model request failed (${response.status}): ${bodyText.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string; type?: string }>;
      };
    }>;
    reply?: string;
  };

  const rawContent = payload.output_text ?? payload.reply ?? payload.choices?.[0]?.message?.content;
  const raw =
    typeof rawContent === "string"
      ? rawContent.trim()
      : Array.isArray(rawContent)
        ? rawContent
            .map((item) => (typeof item?.text === "string" ? item.text : ""))
            .join("\n")
            .trim()
        : "";
  if (!raw) {
    throw new Error("Judge model returned an empty response.");
  }

  return validateEvaluation(raw);
}
