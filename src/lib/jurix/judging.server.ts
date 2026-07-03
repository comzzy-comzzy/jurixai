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
import { sendUsdc } from "@/lib/chain.server";

// Simple Promise chain to serialize txs and prevent nonce conflicts
let agentPaymentQueue = Promise.resolve();

async function payAgentForEvaluation(
  hackathonId: string,
  registrationId: string,
  agent: JudgeAgent,
  amount: number = 0.001,
) {
  const walletAddress = agent.wallet_address;
  if (!walletAddress) {
    console.log(`[agent payment] Agent ${agent.name} has no wallet_address configured. Skipping payment.`);
    return;
  }

  // Queue the payment execution to serialize nonces
  agentPaymentQueue = agentPaymentQueue.then(async () => {
    const supabase = getSupabaseServerClient();
    console.log(`[agent payment] Initiating payment of ${amount} USDC to ${agent.name} (${walletAddress})`);

    // Insert pending payment record
    const { data: paymentRecord, error: insertError } = await supabase
      .from("payments")
      .insert({
        kind: "payout",
        hackathon_id: hackathonId,
        registration_id: registrationId,
        to_address: walletAddress,
        amount_usdc: amount,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(`[agent payment] Failed to log pending payment:`, insertError.message);
    }

    try {
      // Execute the on-chain transfer
      const txHash = await sendUsdc(walletAddress, amount);
      console.log(`[agent payment] On-chain transfer successful. Hash: ${txHash}`);

      // Update payment record to confirmed
      if (paymentRecord) {
        await supabase
          .from("payments")
          .update({
            circle_tx_id: txHash,
            status: "confirmed",
          })
          .eq("id", paymentRecord.id);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "USDC transfer failed";
      console.error(`[agent payment] On-chain transfer failed:`, errMsg);

      // Update payment record to failed
      if (paymentRecord) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
          })
          .eq("id", paymentRecord.id);
      }
    }
  });

  // Await the queued payment to finish so the score isn't marked complete while payments are still running
  await agentPaymentQueue;
}

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
    // Build every (criterion × submission) evaluation up front, then run them
    // with a small concurrency cap. The old code awaited each AI call one at a
    // time, so a run took the SUM of all calls and blew past the serverless time
    // limit (stuck on "judging"). Batching cuts that to ~one call per batch.
    const tasks: Array<() => Promise<void>> = [];
    for (const criterion of hackathon.criteria) {
      const agent =
        hackathon.agents.find((item) => item.id === criterion.agent_id) ??
        hackathon.agents.find((item) => item.slug === "vex-01");
      if (!agent) continue;

      for (const submission of hackathon.submissions) {
        tasks.push(async () => {
          const evaluation = await evaluateSubmissionWithModel(
            agent,
            criterion,
            hackathon,
            submission,
          );
          await writeScore(run.id, submission, criterion, agent, evaluation);

          // Calculate dynamic workload fee based on input size and output complexity
          const workloadLength = (submission.description?.length ?? 0) + (evaluation.rationale?.length ?? 0);
          const baseFee = 0.0002; // Minimum baseline fee
          const dynamicFee = baseFee + workloadLength * 0.000001; // $0.000001 (1 Lepton) per character
          const finalFee = Number(dynamicFee.toFixed(6)); // Limit to USDC decimals

          // Pay the agent the dynamic fee for evaluating the submission
          try {
            await payAgentForEvaluation(hackathon.id, submission.id, agent, finalFee);
          } catch (payErr) {
            console.error(`[judging] Payment of ${finalFee} USDC to agent ${agent.name} failed:`, payErr);
          }

          scored += 1;
        });
      }
    }

    const CONCURRENCY = 5;
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      await Promise.all(tasks.slice(i, i + CONCURRENCY).map((task) => task()));
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
