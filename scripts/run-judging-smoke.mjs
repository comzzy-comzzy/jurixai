import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function getJudgeConfig() {
  const rawProvider = process.env.JURIX_JUDGE_PROVIDER?.trim().toLowerCase();
  const provider =
    rawProvider === "minimax"
      ? "minimax"
      : rawProvider === "openai_compat"
        ? "openai_compat"
        : "openai";
  return {
    provider,
    apiKey: requireEnv("JURIX_JUDGE_API_KEY"),
    model: requireEnv("JURIX_JUDGE_MODEL"),
    baseUrl:
      process.env.JURIX_JUDGE_BASE_URL?.trim() ||
      (provider === "minimax"
        ? "https://api.minimaxi.chat/v1"
        : provider === "openai_compat"
          ? "https://router-api.0g.ai/v1"
          : "https://api.openai.com/v1"),
  };
}

function buildSystemPrompt(agent, criterion) {
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
    "Use a 1.00 to 10.00 score scale.",
    "Return exactly 5 lines and nothing else.",
    "Do not use markdown fences.",
    "Keep the rationale under 320 characters.",
    "Keep evidence entries short and concrete.",
  ].join("\n");
}

function buildUserPrompt(submission) {
  return [
    "Evaluate this submission against the assigned criterion.",
    "",
    `Project name: ${submission.project_name}`,
    `Team name: ${submission.team_name}`,
    `Description: ${submission.description ?? "Not provided"}`,
    `GitHub URL: ${submission.github_url ?? "Not provided"}`,
    `Demo URL: ${submission.demo_url ?? "Not provided"}`,
    `Video URL: ${submission.video_url ?? "Not provided"}`,
    `Payout address: ${submission.payout_address}`,
    `Entry paid: ${submission.entry_paid ? "yes" : "no"}`,
    `Community votes: ${submission.community_votes ?? 0}`,
    `Submission status: ${submission.status}`,
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
    '- "rationale" must be specific to this project and criterion and 320 characters or fewer.',
    '- "evidence" must contain at most 3 short observations from the provided submission fields only.',
    '- "flags" should contain short machine-readable labels such as missing_repo, missing_demo, weak_docs, low_evidence, entry_unpaid.',
    '- If there are no flags, write "FLAGS: none".',
  ].join("\n");
}

function normalizeStringArray(value) {
  return String(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function extractEvaluation(text) {
  const cleaned = String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  const score = Number(cleaned.match(/(?:^|\n)\s*SCORE\s*:\s*([^\n]+)/i)?.[1]);
  const confidence = Number(cleaned.match(/(?:^|\n)\s*CONFIDENCE\s*:\s*([^\n]+)/i)?.[1]);
  const rationale = String(cleaned.match(/(?:^|\n)\s*RATIONALE\s*:\s*([^\n]+)/i)?.[1] ?? "").trim();
  const evidence = normalizeStringArray(
    cleaned.match(/(?:^|\n)\s*EVIDENCE\s*:\s*([^\n]+)/i)?.[1] ?? "",
  );
  const flagsRaw = String(cleaned.match(/(?:^|\n)\s*FLAGS\s*:\s*([^\n]+)/i)?.[1] ?? "").trim();
  const flags = !flagsRaw || /^none$/i.test(flagsRaw) ? [] : normalizeStringArray(flagsRaw);

  if (!Number.isFinite(score) || !Number.isFinite(confidence) || !rationale) {
    throw new Error(`Judge model returned invalid line format: ${cleaned.slice(0, 500)}`);
  }

  return { score, confidence, rationale, evidence, flags };
}

function extractTextFromUnknown(value) {
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
    const record = value;
    return [
      extractTextFromUnknown(record.output_text),
      extractTextFromUnknown(record.text),
      extractTextFromUnknown(record.content),
      extractTextFromUnknown(record.message),
      extractTextFromUnknown(record.reasoning),
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

function extractChoiceText(choice) {
  if (!choice || typeof choice !== "object") return "";
  return (
    extractTextFromUnknown(choice.message) ||
    extractTextFromUnknown(choice.delta) ||
    extractTextFromUnknown(choice)
  );
}

async function evaluate(agent, criterion, submission) {
  const config = getJudgeConfig();
  const body =
    config.provider === "minimax" || config.provider === "openai_compat"
      ? {
          model: config.model,
          messages: [
            { role: "system", content: buildSystemPrompt(agent, criterion) },
            { role: "user", content: buildUserPrompt(submission) },
          ],
          temperature: 0.2,
          // Reasoning models can spend a lot of output budget before they emit
          // the final 5-line verdict. Keep the smoke test aligned with prod.
          max_tokens: 4000,
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
              content: [{ type: "input_text", text: buildUserPrompt(submission) }],
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
    config.provider === "openai_compat"
      ? `${config.baseUrl.replace(/\/$/, "")}/chat/completions`
      : config.provider === "minimax"
        ? `${config.baseUrl.replace(/\/$/, "")}/text/chatcompletion_v2`
        : `${config.baseUrl.replace(/\/$/, "")}/responses`;

  const { status, responseBody } = requestJudgeModel(endpoint, config.apiKey, body);
  if (!(status >= 200 && status < 300)) {
    throw new Error(`Judge request failed ${status}: ${responseBody.slice(0, 400)}`);
  }

  const payload = responseBody ? JSON.parse(responseBody) : {};
  if (config.provider === "openai") {
    const parsed = payload?.output?.[0]?.content?.[0]?.text ?? payload?.output_text ?? "";
    const value = parsed ? JSON.parse(parsed) : null;
    if (!value) throw new Error("Judge model returned an empty response.");
    return {
      score: Number(value.score),
      confidence: Number(value.confidence),
      rationale: String(value.rationale ?? "").trim(),
      evidence: Array.isArray(value.evidence) ? value.evidence.map(String).slice(0, 3) : [],
      flags: Array.isArray(value.flags) ? value.flags.map(String).slice(0, 3) : [],
    };
  }

  const raw =
    extractTextFromUnknown(payload.output_text) ||
    extractTextFromUnknown(payload.reply) ||
    extractTextFromUnknown(payload.text) ||
    extractChoiceText(Array.isArray(payload.choices) ? payload.choices[0] : null) ||
    extractTextFromUnknown(payload.output?.[0]) ||
    extractTextFromUnknown(payload);
  return extractEvaluation(raw);
}

function requestJudgeModel(endpoint, apiKey, body) {
  const curl = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      endpoint,
      "-H",
      "content-type: application/json",
      "-H",
      `authorization: Bearer ${apiKey}`,
      "-d",
      JSON.stringify(body),
      "-w",
      "\n%{http_code}",
    ],
    { encoding: "utf8" },
  );

  if (curl.error) {
    throw new Error(`Judge request failed: ${curl.error.message}`);
  }

  const combined = curl.stdout ?? "";
  const splitAt = combined.lastIndexOf("\n");
  const responseBody = splitAt === -1 ? combined.trim() : combined.slice(0, splitAt);
  const status = splitAt === -1 ? 0 : Number(combined.slice(splitAt + 1).trim());

  return { status, responseBody };
}

async function main() {
  const hackathonId = "agent-commerce-sprint";

  const [
    { data: criteria, error: criteriaError },
    { data: agents, error: agentsError },
    { data: submissions, error: submissionsError },
  ] = await Promise.all([
    supabase
      .from("judging_criteria")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("sort_order"),
    supabase.from("judge_agents").select("*").order("weight_percent", { ascending: false }),
    supabase.from("registrations").select("*").eq("hackathon_id", hackathonId),
  ]);

  if (criteriaError) throw criteriaError;
  if (agentsError) throw agentsError;
  if (submissionsError) throw submissionsError;
  if (!criteria?.length) throw new Error("No criteria found.");
  if (!submissions?.length) throw new Error("No submissions found.");

  const { data: runRow, error: runError } = await supabase
    .from("judging_runs")
    .insert({
      hackathon_id: hackathonId,
      status: "running",
      triggered_by: "codex-smoke",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (runError) throw runError;

  const items = [];
  for (const criterion of criteria) {
    const agent =
      agents.find((row) => row.id === criterion.agent_id) ??
      agents.find((row) => row.slug === "vex-01");
    if (!agent) continue;
    for (const submission of submissions) {
      items.push({
        run_id: runRow.id,
        registration_id: submission.id,
        agent_id: agent.id,
        criterion_id: criterion.id,
        status: "pending",
      });
    }
  }

  const { error: itemsError } = await supabase.from("judging_run_items").upsert(items, {
    onConflict: "run_id,registration_id,agent_id,criterion_id",
  });
  if (itemsError) throw itemsError;

  let scored = 0;
  for (const criterion of criteria) {
    const agent =
      agents.find((row) => row.id === criterion.agent_id) ??
      agents.find((row) => row.slug === "vex-01");
    if (!agent) continue;
    for (const submission of submissions) {
      await supabase
        .from("judging_run_items")
        .update({ status: "running", started_at: new Date().toISOString(), error_message: null })
        .eq("run_id", runRow.id)
        .eq("registration_id", submission.id)
        .eq("criterion_id", criterion.id)
        .eq("agent_id", agent.id);

      const evaluation = await evaluate(agent, criterion, submission);

      const { error: scoreError } = await supabase.from("submission_scores").upsert(
        {
          registration_id: submission.id,
          criterion_id: criterion.id,
          agent_id: agent.id,
          score: evaluation.score,
          confidence: evaluation.confidence,
          rationale: evaluation.rationale,
          evidence: evaluation.evidence,
          flags: evaluation.flags,
        },
        { onConflict: "registration_id,criterion_id,agent_id" },
      );
      if (scoreError) throw scoreError;

      const { error: completeItemError } = await supabase
        .from("judging_run_items")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("run_id", runRow.id)
        .eq("registration_id", submission.id)
        .eq("criterion_id", criterion.id)
        .eq("agent_id", agent.id);
      if (completeItemError) throw completeItemError;

      scored += 1;
    }
  }

  await supabase
    .from("registrations")
    .update({ status: "complete" })
    .eq("hackathon_id", hackathonId);
  await supabase.from("hackathons").update({ status: "closed" }).eq("id", hackathonId);
  await supabase
    .from("judging_runs")
    .update({ status: "completed", completed_at: new Date().toISOString(), error_message: null })
    .eq("id", runRow.id);

  const [{ data: scores }, { data: runItems }, { data: runs }] = await Promise.all([
    supabase
      .from("submission_scores")
      .select("registration_id,criterion_id,agent_id,score,confidence,rationale,evidence,flags")
      .eq("registration_id", submissions[0].id),
    supabase
      .from("judging_run_items")
      .select("run_id,registration_id,agent_id,criterion_id,status,error_message")
      .eq("run_id", runRow.id),
    supabase
      .from("judging_runs")
      .select("id,hackathon_id,status,triggered_by,started_at,completed_at,error_message")
      .eq("id", runRow.id),
  ]);

  console.log(
    JSON.stringify(
      {
        runId: runRow.id,
        scored,
        runs,
        runItems,
        scores,
      },
      null,
      2,
    ),
  );

  console.log("\n======================================================================");
  console.log("                     JURIXAI SMOKE TEST AUDIT REPORT                   ");
  console.log("======================================================================");
  console.log(`Hackathon ID: ${hackathonId}`);
  console.log(`Run ID: ${runRow.id}`);
  console.log("======================================================================\n");

  for (const submission of submissions) {
    const subScores = scores.filter((s) => s.registration_id === submission.id);
    const sum = subScores.reduce((acc, s) => acc + s.score, 0);
    const avg = subScores.length ? (sum / subScores.length).toFixed(2) : "0.00";
    
    console.log(`📂 Repository/Project: ${submission.project_name} (Team: ${submission.team_name})`);
    console.log(`GitHub URL: ${submission.github_url || "N/A"}`);
    console.log(`Average Score: ${avg} / 10`);
    console.log("----------------------------------------------------------------------");
    
    subScores.forEach((s) => {
      const agent = agents.find((a) => a.id === s.agent_id) || { name: s.agent_id, role: "Judge Agent" };
      console.log(`🤖 Agent: ${agent.name} (${agent.role})`);
      console.log(`   Score: ${s.score} / 10`);
      console.log(`   Confidence: ${(s.confidence * 100).toFixed(0)}%`);
      console.log(`   Rationale: ${s.rationale}`);
      if (s.evidence && s.evidence.length > 0) {
        console.log(`   Evidence:`);
        s.evidence.forEach((ev) => console.log(`     - ${ev}`));
      }
      if (s.flags && s.flags.length > 0) {
        console.log(`   Flags:`);
        s.flags.forEach((f) => console.log(`     - ${f}`));
      }
      console.log("");
    });
    console.log("======================================================================\n");
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
