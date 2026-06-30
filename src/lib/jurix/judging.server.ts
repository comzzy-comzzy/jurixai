import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import type {
  HackathonDetail,
  JudgeAgent,
  JudgingCriterion,
  SubmissionSummary,
} from "@/lib/jurix/types";
import {
  evaluateSubmissionWithModel,
  hasJudgeModelConfig,
  type AgentEvaluation,
} from "@/lib/jurix/judge-model.server";
import { getHackathonDetail, listHackathons } from "./data.server";

async function ensureRunItems(
  runId: string,
  submissions: SubmissionSummary[],
  criteria: JudgingCriterion[],
  agents: JudgeAgent[],
) {
  const supabase = getSupabaseServerClient();
  const items = criteria.flatMap((criterion) => {
    const agent = agents.find((item) => item.id === criterion.agent_id) ?? agents.find((item) => item.slug === "vex-01");
    if (!agent) return [];
    return submissions.map((submission) => ({
      run_id: runId,
      registration_id: submission.id,
      agent_id: agent.id,
      criterion_id: criterion.id,
      status: "pending",
    }));
  });

  if (items.length === 0) return;
  const { error } = await supabase.from("judging_run_items").upsert(items, {
    onConflict: "run_id,registration_id,agent_id,criterion_id",
  });
  if (error) throw new Error(error.message);
}

async function startRun(hackathonId: string, triggeredBy: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("judging_runs")
    .insert({
      hackathon_id: hackathonId,
      status: "running",
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function completeRun(runId: string, status: "completed" | "failed", errorMessage?: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("judging_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: errorMessage ?? null,
    })
    .eq("id", runId);

  if (error) throw new Error(error.message);
}

async function writeScore(
  runId: string,
  submission: SubmissionSummary,
  criterion: JudgingCriterion,
  agent: JudgeAgent,
  evaluation: AgentEvaluation,
) {
  const supabase = getSupabaseServerClient();
  const startedAt = new Date().toISOString();

  await supabase
    .from("judging_run_items")
    .update({ status: "running", started_at: startedAt, error_message: null })
    .eq("run_id", runId)
    .eq("registration_id", submission.id)
    .eq("criterion_id", criterion.id)
    .eq("agent_id", agent.id);

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

  if (scoreError) {
    await supabase
      .from("judging_run_items")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: scoreError.message,
      })
      .eq("run_id", runId)
      .eq("registration_id", submission.id)
      .eq("criterion_id", criterion.id)
      .eq("agent_id", agent.id);
    throw new Error(scoreError.message);
  }

  const { error: itemError } = await supabase
    .from("judging_run_items")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("run_id", runId)
    .eq("registration_id", submission.id)
    .eq("criterion_id", criterion.id)
    .eq("agent_id", agent.id);

  if (itemError) throw new Error(itemError.message);
}

async function markSubmissionStatuses(hackathonId: string, status: "reviewing" | "complete") {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("registrations")
    .update({ status })
    .eq("hackathon_id", hackathonId);
  if (error) throw new Error(error.message);
}

async function markHackathonStatus(hackathonId: string, status: "judging" | "closed") {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("hackathons").update({ status }).eq("id", hackathonId);
  if (error) throw new Error(error.message);
}

export async function runHackathonJudging(
  hackathon: HackathonDetail,
  triggeredBy = "system",
): Promise<{ runId: string; scored: number }> {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Supabase is not configured.");
  }
  if (!hasJudgeModelConfig()) {
    throw new Error(
      "Real judging is not configured. Set JURIX_JUDGE_API_KEY and JURIX_JUDGE_MODEL before running agent evaluations.",
    );
  }

  if (hackathon.submissions.length === 0) {
    throw new Error("No submissions available to judge.");
  }

  const run = await startRun(hackathon.id, triggeredBy);
  await ensureRunItems(run.id, hackathon.submissions, hackathon.criteria, hackathon.agents);
  await markHackathonStatus(hackathon.id, "judging");
  await markSubmissionStatuses(hackathon.id, "reviewing");

  let scored = 0;

  try {
    for (const criterion of hackathon.criteria) {
      const agent =
        hackathon.agents.find((item) => item.id === criterion.agent_id) ??
        hackathon.agents.find((item) => item.slug === "vex-01");
      if (!agent) continue;

      for (const submission of hackathon.submissions) {
        const evaluation = await evaluateSubmissionWithModel(
          agent,
          criterion,
          hackathon,
          submission,
        );
        await writeScore(run.id, submission, criterion, agent, evaluation);
        scored += 1;
      }
    }

    await markSubmissionStatuses(hackathon.id, "complete");
    await markHackathonStatus(hackathon.id, "closed");
    await completeRun(run.id, "completed");
    return { runId: run.id, scored };
  } catch (error) {
    await completeRun(run.id, "failed", error instanceof Error ? error.message : "Judging failed.");
    throw error;
  }
}

export async function runExpiredHackathons(triggeredBy = "system") {
  const hackathons = await listHackathons();
  const expired = hackathons.filter(
    (hackathon) =>
      hackathon.status === "open" &&
      hackathon.deadline &&
      new Date(hackathon.deadline).getTime() <= Date.now(),
  );

  const results: Array<{ hackathonId: string; runId: string; scored: number }> = [];

  for (const hackathon of expired) {
    const detail = await getHackathonDetail(hackathon.id);
    if (!detail) continue;
    const result = await runHackathonJudging(detail, triggeredBy);
    results.push({ hackathonId: hackathon.id, ...result });
  }

  return results;
}
