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

type SubmissionSignals = {
  hasGithub: boolean;
  hasDemo: boolean;
  hasVideo: boolean;
  demoRequired: boolean;
  videoRequired: boolean;
  entryPaid: boolean;
  hasDescription: boolean;
  repoAccessible: boolean;
  repoInaccessible: boolean;
  hasReadme: boolean;
  hasPackageJson: boolean;
  demoPlaceholder: boolean;
  videoPlaceholder: boolean;
  namingMismatch: boolean;
  deliverablesMissing: string[];
  briefMismatch: boolean;
};

type RepoPageFallback = {
  description: string | null;
  branch: string | null;
  rootFiles: string[];
  readmeText: string | null;
};

type FetchResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
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

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
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
      ...(process.env.GITHUB_TOKEN?.trim()
        ? { authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
        : {}),
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      accept: "text/plain, text/html;q=0.9, application/vnd.github.raw+json;q=0.8, */*;q=0.1",
      "user-agent": "jurixai-judge-bot",
      ...(process.env.GITHUB_TOKEN?.trim()
        ? { authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
        : {}),
    },
  });

  if (!response.ok) return null;
  return await response.text();
}

async function fetchJsonDetailed<T>(url: string): Promise<FetchResult<T>> {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "jurixai-judge-bot",
      ...(process.env.GITHUB_TOKEN?.trim()
        ? { authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
        : {}),
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? ((await response.json()) as T) : null,
  };
}

async function fetchTextDetailed(url: string): Promise<FetchResult<string>> {
  const response = await fetch(url, {
    headers: {
      accept: "text/plain, text/html;q=0.9, application/vnd.github.raw+json;q=0.8, */*;q=0.1",
      "user-agent": "jurixai-judge-bot",
      ...(process.env.GITHUB_TOKEN?.trim()
        ? { authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
        : {}),
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? await response.text() : null,
  };
}

function parseRepoPageFallback(html: string, owner: string, repo: string): RepoPageFallback | null {
  if (!html.trim()) return null;

  const repoPath = `/${owner}/${repo}/`;
  const branchMatches = [
    ...html.matchAll(new RegExp(`${repoPath}(?:blob|tree)/([^/"?#]+)/([^"?#]+)`, "g")),
  ];
  const branch = branchMatches[0]?.[1] ?? null;
  const rootFiles = unique(
    branchMatches
      .map((match) => match[2]?.split("/")[0]?.trim())
      .filter((value): value is string => Boolean(value)),
  ).slice(0, 16);

  const description =
    html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim() ?? null;

  const readmeMatch =
    html.match(/<article[^>]*markdown-body[^>]*>([\s\S]*?)<\/article>/i) ??
    html.match(/<div[^>]*id="readme"[^>]*>([\s\S]*?)<\/div>/i);

  return {
    description: description ? decodeHtml(description) : null,
    branch,
    rootFiles,
    readmeText: readmeMatch ? stripHtml(readmeMatch[1]) : null,
  };
}

async function loadRepoContext(githubUrl: string | null): Promise<RepoContext | null> {
  const repoRef = parseGitHubRepo(githubUrl);
  if (!repoRef) return null;

  const repoMetaResult = await fetchJsonDetailed<{
    full_name?: string;
    default_branch?: string;
    stargazers_count?: number;
    open_issues_count?: number;
    description?: string | null;
    language?: string | null;
  }>(`https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}`);
  const repoMeta = repoMetaResult.data;

  const rootEntriesResult = await fetchJsonDetailed<Array<{ name?: string; type?: string }>>(
    `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/contents`,
  );
  const rootEntries = rootEntriesResult.data;

  const repoPageHtmlResult = await fetchTextDetailed(
    `https://github.com/${repoRef.owner}/${repoRef.repo}`,
  );
  const repoPageHtml = repoPageHtmlResult.data;
  const repoPageFallback = repoPageHtml
    ? parseRepoPageFallback(repoPageHtml, repoRef.owner, repoRef.repo)
    : null;

  const branchCandidates = unique(
    [repoMeta?.default_branch, repoPageFallback?.branch, "main", "master"].filter(
      (value): value is string => Boolean(value),
    ),
  );

  let readme: string | null = null;
  const readmeStatuses: number[] = [];
  for (const branch of branchCandidates) {
    const upperReadme = await fetchTextDetailed(
      `https://raw.githubusercontent.com/${repoRef.owner}/${repoRef.repo}/${branch}/README.md`,
    );
    readmeStatuses.push(upperReadme.status);
    readme = upperReadme.data;
    if (!readme?.trim()) {
      const lowerReadme = await fetchTextDetailed(
        `https://raw.githubusercontent.com/${repoRef.owner}/${repoRef.repo}/${branch}/readme.md`,
      );
      readmeStatuses.push(lowerReadme.status);
      readme = lowerReadme.data;
    }
    if (readme?.trim()) break;
  }
  if (!readme?.trim()) {
    readme = repoPageFallback?.readmeText ?? null;
  }

  let packageJson: string | null = null;
  const packageStatuses: number[] = [];
  for (const branch of branchCandidates) {
    const packageResult = await fetchTextDetailed(
      `https://raw.githubusercontent.com/${repoRef.owner}/${repoRef.repo}/${branch}/package.json`,
    );
    packageStatuses.push(packageResult.status);
    packageJson = packageResult.data;
    if (packageJson?.trim()) break;
  }

  const rootFileNames =
    rootEntries?.map((entry) => entry.name ?? "unknown").filter(Boolean) ??
    repoPageFallback?.rootFiles ??
    [];

  const evidence: string[] = [];
  if (repoMeta?.full_name) evidence.push(`Repository: ${repoMeta.full_name}`);
  else evidence.push(`Repository: ${repoRef.owner}/${repoRef.repo}`);
  if (repoMeta?.language) {
    evidence.push(`Primary language: ${repoMeta.language}`);
  } else if (repoPageFallback?.description) {
    evidence.push(`Repo page found for ${repoRef.owner}/${repoRef.repo}`);
  }
  if (rootEntries?.length || rootFileNames.length > 0) {
    evidence.push(
      `Root entries: ${rootFileNames
        .slice(0, 8)
        .map((entry, index) =>
          rootEntries?.[index]?.type
            ? `${entry} (${rootEntries[index]?.type ?? "unknown"})`
            : entry,
        )
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

  const likelyPrivateOrRestricted =
    repoMetaResult.status === 404 &&
    rootEntriesResult.status === 404 &&
    repoPageHtmlResult.status === 404 &&
    readmeStatuses.some((status) => status === 404) &&
    packageStatuses.some((status) => status === 404);

  if (likelyPrivateOrRestricted) {
    evidence.push("Repository is private or inaccessible to anonymous fetches");
  }

  const summaryLines = [
    repoMeta?.description
      ? `Repo description: ${repoMeta.description}`
      : repoPageFallback?.description
        ? `Repo description: ${repoPageFallback.description}`
        : null,
    likelyPrivateOrRestricted
      ? "Repo access note: GitHub returned 404 for anonymous API, raw, and web requests. This usually means the repository is private or otherwise not publicly accessible from the judging runtime."
      : null,
    repoMeta?.language ? `Primary language: ${repoMeta.language}` : null,
    rootFileNames.length > 0
      ? `Root files: ${rootFileNames.slice(0, 12).join(", ")}`
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

function buildSubmissionSignals(
  criterion: JudgingCriterion,
  hackathon: HackathonSummary,
  submission: SubmissionSummary,
  repoContext: RepoContext | null,
): SubmissionSignals {
  const description = submission.description?.trim().toLowerCase() ?? "";
  const brief = [
    hackathon.name,
    hackathon.description,
    hackathon.submission_instructions,
    ...hackathon.required_deliverables,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const projectName = submission.project_name.trim().toLowerCase();
  const githubUrl = submission.github_url?.trim().toLowerCase() ?? "";
  const demoUrl = submission.demo_url?.trim().toLowerCase() ?? "";
  const videoUrl = submission.video_url?.trim().toLowerCase() ?? "";
  const repoSummary = repoContext?.summary.toLowerCase() ?? "";
  const repoEvidence = repoContext?.evidence.join(" ").toLowerCase() ?? "";
  const combinedRepo = `${repoSummary} ${repoEvidence}`.trim();

  const hasGithub = Boolean(submission.github_url?.trim());
  const hasDemo = Boolean(submission.demo_url?.trim());
  const hasVideo = Boolean(submission.video_url?.trim());
  const entryPaid = submission.entry_paid;
  const hasDescription = Boolean(submission.description?.trim());
  const demoPlaceholder = /example\.com|placeholder|demo coming soon/.test(demoUrl);
  const videoPlaceholder = /example\.com|placeholder|video coming soon/.test(videoUrl);
  const repoInaccessible = /private or inaccessible to anonymous fetches/.test(combinedRepo);
  const repoAccessible = Boolean(repoContext) && !repoInaccessible;
  const hasReadme = /readme present/.test(repoEvidence) || /readme excerpt:/.test(repoSummary);
  const hasPackageJson =
    /package\.json present/.test(repoEvidence) || /package\.json excerpt:/.test(repoSummary);

  const projectTokens = unique(
    projectName
      .split(/[^a-z0-9]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 4),
  );
  const targetSurface = `${githubUrl} ${demoUrl} ${videoUrl}`.trim();
  const namingMismatch =
    projectTokens.length > 0 &&
    !projectTokens.some((token) => targetSurface.includes(token)) &&
    Boolean(targetSurface);

  const deliverablesMissing = hackathon.required_deliverables
    .filter((deliverable) => {
      const normalized = deliverable.toLowerCase();
      if (normalized.includes("optional")) return false;
      if (normalized.includes("video")) return !hasVideo || videoPlaceholder;
      if (normalized.includes("github") || normalized.includes("repo")) return !hasGithub;
      if (normalized.includes("demo")) return !hasDemo || demoPlaceholder;
      if (normalized.includes("readme")) return !hasReadme;
      return false;
    })
    .slice(0, 4);

  const requiredDeliverablesText = hackathon.required_deliverables
    .filter((item) => !item.toLowerCase().includes("optional"))
    .join(" ")
    .toLowerCase();
  const demoRequired = requiredDeliverablesText.includes("demo");
  const videoRequired = requiredDeliverablesText.includes("video");

  const criterionText = `${criterion.name} ${criterion.description ?? ""}`.toLowerCase();
  const commerceSignals = ["commerce", "checkout", "cart", "payment", "merchant", "store"];
  const briefCallsForCommerce = commerceSignals.some(
    (token) => brief.includes(token) || criterionText.includes(token),
  );
  const submissionShowsCommerce = commerceSignals.some(
    (token) =>
      description.includes(token) || projectName.includes(token) || combinedRepo.includes(token),
  );
  const briefMismatch = briefCallsForCommerce && !submissionShowsCommerce;

  return {
    hasGithub,
    hasDemo,
    hasVideo,
    demoRequired,
    videoRequired,
    entryPaid,
    hasDescription,
    repoAccessible,
    repoInaccessible,
    hasReadme,
    hasPackageJson,
    demoPlaceholder,
    videoPlaceholder,
    namingMismatch,
    deliverablesMissing,
    briefMismatch,
  };
}

function buildFallbackEvaluation(
  agent: JudgeAgent,
  criterion: JudgingCriterion,
  hackathon: HackathonSummary,
  submission: SubmissionSummary,
  repoContext: RepoContext | null,
  reason: string,
): AgentEvaluation {
  const signals = buildSubmissionSignals(criterion, hackathon, submission, repoContext);
  const criterionText =
    `${criterion.name} ${criterion.description ?? ""} ${agent.focus_area}`.toLowerCase();
  let score = 6.4;
  let confidence = 0.64;
  const evidence: string[] = [];
  const flags: string[] = [];

  if (signals.hasDescription) {
    evidence.push("Project description was submitted");
    score += 0.35;
  } else {
    flags.push("missing_description");
    score -= 1.1;
  }

  if (signals.hasGithub) {
    evidence.push(`GitHub link submitted: ${submission.github_url}`);
    score += 0.3;
  } else {
    flags.push("missing_repo");
    score -= 1.4;
  }

  if (signals.repoAccessible) {
    evidence.push(...(repoContext?.evidence ?? []).slice(0, 2));
    score += 0.55;
    confidence += 0.08;
  }

  if (signals.repoInaccessible) {
    evidence.push(
      "Public repo inspection failed because the linked GitHub repo is not anonymously accessible",
    );
    flags.push("inaccessible_repo");
    score -= 2.1;
    confidence -= 0.16;
  }

  if (signals.hasDemo) {
    evidence.push(`Demo link submitted: ${submission.demo_url}`);
    score += 0.3;
  } else if (signals.demoRequired) {
    flags.push("missing_demo");
    score -= 1;
  }

  if (signals.demoPlaceholder) {
    flags.push("placeholder_demo");
    score -= 0.9;
  }

  if (signals.hasVideo) {
    evidence.push(`Video link submitted: ${submission.video_url}`);
    score += 0.2;
  } else if (signals.videoRequired) {
    flags.push("missing_video");
    score -= 0.85;
  }

  if (signals.videoPlaceholder) {
    flags.push("placeholder_video");
    score -= 1;
  }

  if (!signals.entryPaid) {
    flags.push("entry_unpaid");
    score -= 0.7;
  }

  if (signals.namingMismatch) {
    flags.push("naming_mismatch");
    score -= 0.7;
  }

  if (signals.deliverablesMissing.length > 0) {
    flags.push("missing_deliverable");
    score -= Math.min(1.4, signals.deliverablesMissing.length * 0.45);
  }

  if (signals.briefMismatch) {
    flags.push("off_brief");
    score -= 1.2;
  }

  if (
    criterionText.includes("code") ||
    criterionText.includes("engineering") ||
    criterionText.includes("technical")
  ) {
    if (signals.repoInaccessible) score -= 0.9;
    if (signals.hasPackageJson) score += 0.45;
    if (signals.hasReadme) score += 0.25;
    if (!signals.hasReadme) flags.push("weak_readme");
  } else if (
    criterionText.includes("product") ||
    criterionText.includes("ux") ||
    criterionText.includes("user")
  ) {
    if (!signals.hasDemo || signals.demoPlaceholder) score -= 0.6;
    if (!signals.hasDescription) score -= 0.6;
  } else if (
    criterionText.includes("innovation") ||
    criterionText.includes("original") ||
    criterionText.includes("differenti")
  ) {
    if (signals.briefMismatch) score -= 0.7;
    if (signals.hasDescription && !signals.briefMismatch) score += 0.35;
  } else if (
    criterionText.includes("delivery") ||
    criterionText.includes("documentation") ||
    criterionText.includes("polish") ||
    criterionText.includes("shipping")
  ) {
    if (!signals.hasReadme) score -= 0.8;
    if (signals.videoRequired && (!signals.hasVideo || signals.videoPlaceholder)) score -= 0.8;
    if (signals.deliverablesMissing.length > 0) score -= 0.4;
  }

  if (evidence.length === 0) {
    evidence.push(
      "Scored from the submission record because no inspectable public repo evidence was available",
    );
    flags.push("low_evidence");
    confidence -= 0.1;
  }

  if (signals.deliverablesMissing.length > 0) {
    evidence.push(
      `Missing required deliverables: ${signals.deliverablesMissing
        .map((item) => item.replace(/\s+/g, " ").trim())
        .join("; ")}`,
    );
  }

  const rationaleParts = [
    `This score is based on the submitted ${signals.hasGithub ? "repo link" : "project record"}, ${signals.hasDemo ? "demo link" : signals.demoRequired ? "missing required demo" : "no demo link"}, and ${signals.hasVideo ? "video evidence" : signals.videoRequired ? "missing required video evidence" : "no video link"}.`,
    signals.repoInaccessible
      ? "The linked GitHub repository could not be inspected publicly, which reduced technical confidence."
      : null,
    signals.briefMismatch
      ? "The available materials do not clearly show alignment with the commerce-focused brief."
      : null,
    signals.deliverablesMissing.length > 0 ? "Required deliverables were incomplete." : null,
  ]
    .filter(Boolean)
    .join(" ");

  const finalFlags = unique(flags).slice(0, 6);
  const finalEvidence = unique(evidence).slice(0, 6);

  if (reason) {
    // Surface WHY the real model was not used so it can be diagnosed from the
    // project page (otherwise the fallback looks like a normal, generic score).
    finalFlags.push("fallback_scoring");
    finalEvidence.unshift(`model_error: ${reason}`.slice(0, 240));
    console.error("[jurix judge] falling back to deterministic score:", reason);
  }

  return {
    score: Number(clamp(score, 1, 10).toFixed(2)),
    confidence: Number(clamp(confidence, 0.2, 0.95).toFixed(2)),
    rationale: truncate(rationaleParts, 320),
    evidence: finalEvidence,
    flags: unique(finalFlags).slice(0, 6),
  };
}

export function hasJudgeModelConfig(): boolean {
  return Boolean(process.env.JURIX_JUDGE_API_KEY?.trim() && process.env.JURIX_JUDGE_MODEL?.trim());
}

/**
 * One-shot diagnostic: send a trivial prompt to the configured judge model and
 * return the raw HTTP status + response body. Surfaces exactly why real judging
 * falls back (wrong model id, bad auth, wrong endpoint, unexpected shape).
 */
export async function probeJudgeModel(): Promise<{
  configured: boolean;
  provider?: string;
  endpoint?: string;
  model?: string;
  ok?: boolean;
  status?: number;
  body?: string;
  error?: string;
}> {
  if (!hasJudgeModelConfig()) {
    return { configured: false };
  }
  try {
    const config = getJudgeModelConfig();
    const base = config.baseUrl.replace(/\/$/, "");
    const endpoint =
      config.provider === "openai_compat"
        ? `${base}/chat/completions`
        : config.provider === "minimax"
          ? `${base}/text/chatcompletion_v2`
          : `${base}/responses`;
    const res = await requestJudgeModel(endpoint, config.apiKey, {
      model: config.model,
      messages: [{ role: "user", content: "Reply with the single word OK." }],
      max_tokens: 4000,
    });
    return {
      configured: true,
      provider: config.provider,
      endpoint,
      model: config.model,
      ok: res.ok,
      status: res.status,
      body: res.bodyText.slice(0, 700),
    };
  } catch (e) {
    return { configured: true, error: e instanceof Error ? e.message : String(e) };
  }
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
  const agentSlug = agent.slug.toLowerCase();
  const criterionText = `${criterion.name} ${criterion.description ?? ""}`.toLowerCase();
  const kaelInstructions =
    agentSlug === "kael-02" ||
    criterionText.includes("product") ||
    criterionText.includes("ux") ||
    criterionText.includes("user")
      ? [
          "Product-judge mode:",
          "- Judge whether the submission clearly identifies a real problem, a real user, and a plausible end-to-end user flow.",
          "- Do not reward generic AI-agent claims unless the submitted materials show what the agent actually does for a user.",
          "- In the rationale, name the strongest product proof and the biggest product gap.",
          "- If no demo is provided, say whether the repo/description still prove enough product completeness.",
        ].join("\n")
      : null;

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
    "Judge against the assigned criterion first, not against a generic overall impression.",
    "If the project appears off-brief or misses required deliverables, state that directly in the rationale and flags.",
    "The rationale must mention at least one concrete submission or repo fact and explain how it affected this criterion score.",
    "Use a 1.00 to 10.00 score scale.",
    "Return exactly 5 lines and nothing else.",
    "Do not use markdown fences.",
    "Keep the rationale under 320 characters.",
    "Keep evidence entries short and concrete.",
    kaelInstructions,
  ].join("\n");
}

function buildUserPrompt(
  agent: JudgeAgent,
  criterion: JudgingCriterion,
  hackathon: HackathonSummary,
  submission: SubmissionSummary,
  repoContext: RepoContext | null,
): string {
  const criterionFocus = [
    `Assigned judge: ${agent.name} (${agent.role})`,
    `Assigned criterion: ${criterion.name}`,
    `Criterion details: ${optional(criterion.description)}`,
    `Criterion weight: ${criterion.weight_percent}%`,
  ].join("\n");

  return [
    "Evaluate this submission against the assigned criterion.",
    "",
    criterionFocus,
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
    '- "rationale" must explain the score using criterion-specific reasoning, not a generic summary.',
    '- "evidence" must contain at most 3 short observations from the provided hackathon, submission fields, and repo inspection only.',
    '- "flags" should contain short machine-readable labels such as missing_repo, missing_demo, off_brief, missing_deliverable, weak_docs, weak_repo_structure, weak_readme, low_evidence, entry_unpaid.',
    '- If there are no flags, write "FLAGS: none".',
    "- A missing video is not a problem unless the host explicitly required a video deliverable.",
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

function extractTextFromUnknown(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => extractTextFromUnknown(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [
      extractTextFromUnknown(record.output_text),
      extractTextFromUnknown(record.text),
      extractTextFromUnknown(record.content),
      // OpenAI chat shape: choices[0].message.{content,reasoning}. Reasoning
      // models (e.g. GLM 5.1) put the answer in message.content, so recurse in.
      extractTextFromUnknown(record.message),
      extractTextFromUnknown(record.reasoning),
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

function extractChoiceText(choice: unknown): string {
  if (!choice || typeof choice !== "object") return "";
  const record = choice as Record<string, unknown>;
  return (
    extractTextFromUnknown(record.message) ||
    extractTextFromUnknown(record.delta) ||
    extractTextFromUnknown(choice)
  );
}

async function requestJudgeModel(
  endpoint: string,
  apiKey: string,
  body: unknown,
): Promise<{
  ok: boolean;
  status: number;
  bodyText: string;
  json: Record<string, unknown> | null;
}> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const bodyText = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    bodyText,
    json,
  };
}

function validateEvaluation(raw: string): AgentEvaluation {
  const text = stripReasoningPreamble(raw);
  const score = clamp(Number(text.match(/(?:^|\n)\s*SCORE\s*:\s*([^\n]+)/i)?.[1]), 1, 10);
  const confidence = clamp(Number(text.match(/(?:^|\n)\s*CONFIDENCE\s*:\s*([^\n]+)/i)?.[1]), 0, 1);
  const rationale = text.match(/(?:^|\n)\s*RATIONALE\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
  const evidence = normalizeStringArray(
    text.match(/(?:^|\n)\s*EVIDENCE\s*:\s*([^\n]+)/i)?.[1] ?? "",
  );
  const flagsRaw = text.match(/(?:^|\n)\s*FLAGS\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
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

  if (rationale.split(/\s+/).filter(Boolean).length < 8) {
    throw new Error("Judge model returned a rationale that is too shallow.");
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
  const endpoint =
    config.provider === "minimax" || config.provider === "openai_compat"
      ? `${config.baseUrl.replace(/\/$/, "")}/text/chatcompletion_v2`
      : `${config.baseUrl.replace(/\/$/, "")}/responses`;

  const finalEndpoint =
    config.provider === "openai_compat"
      ? `${config.baseUrl.replace(/\/$/, "")}/chat/completions`
      : endpoint;
  const requestBodies =
    config.provider === "minimax" || config.provider === "openai_compat"
      ? [
          {
            model: config.model,
            messages: [
              { role: "system", content: buildSystemPrompt(agent, criterion) },
              {
                role: "user",
                content: buildUserPrompt(agent, criterion, hackathon, submission, repoContext),
              },
            ],
            temperature: 0.2,
            // Keep the smoke test and production path aligned: reasoning models
            // need enough output budget to finish their internal reasoning and
            // still emit the required 5-line verdict.
            max_tokens: 4000,
          },
        ]
      : [
          {
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
                    text: buildUserPrompt(agent, criterion, hackathon, submission, repoContext),
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
          },
          {
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
                    text: buildUserPrompt(agent, criterion, hackathon, submission, repoContext),
                  },
                ],
              },
            ],
          },
        ];

  let lastError = "Judge model returned an empty response.";

  for (const body of requestBodies) {
    const result = await requestJudgeModel(finalEndpoint, config.apiKey, body);
    if (!result.ok) {
      lastError = `Judge model request failed (${result.status}): ${result.bodyText.slice(0, 400)}`;
      continue;
    }

    const payload = result.json ?? {};
    const raw =
      extractTextFromUnknown(payload.output_text) ||
      extractTextFromUnknown(payload.reply) ||
      extractTextFromUnknown(payload.text) ||
      extractChoiceText(Array.isArray(payload.choices) ? payload.choices[0] : null) ||
      extractTextFromUnknown(payload.output?.[0]) ||
      extractTextFromUnknown(payload);

    if (!raw) {
      lastError = "Judge model returned an empty response.";
      continue;
    }

    if (raw.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(raw) as Partial<AgentEvaluation>;
        if (
          typeof parsed.score === "number" &&
          typeof parsed.confidence === "number" &&
          typeof parsed.rationale === "string"
        ) {
          return {
            score: Number(clamp(parsed.score, 1, 10).toFixed(2)),
            confidence: Number(clamp(parsed.confidence, 0, 1).toFixed(2)),
            rationale: parsed.rationale.trim(),
            evidence: Array.isArray(parsed.evidence)
              ? parsed.evidence.map(String).filter(Boolean).slice(0, 6)
              : [],
            flags: Array.isArray(parsed.flags)
              ? parsed.flags.map(String).filter(Boolean).slice(0, 6)
              : [],
          };
        }
      } catch {
        // Fall through to line-based validation.
      }
    }

    return validateEvaluation(raw);
  }

  throw new Error(
    `Model judging did not produce a valid evaluation. Heuristic fallback is disabled. ${lastError}`,
  );
}
