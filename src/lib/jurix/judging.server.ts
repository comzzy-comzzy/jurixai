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
import { getHackathonDetail, listHackathons, fetchWeightedScores } from "./data.server";
import { sendUsdc, disbursePrizesOnChain } from "@/lib/chain.server";
import { readUsdcBalance } from "@/lib/chain";

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

    // Automatically disburse prizes to winners on-chain
    try {
      console.log(`[judging] Judging completed. Initiating automatic prize disbursement for hackathon: ${hackathon.id}`);
      const payoutResult = await disburseHackathonPrizesInternal(hackathon.id);
      console.log(`[judging] Automatic prize disbursement completed:`, payoutResult);
    } catch (payoutErr) {
      console.error(`[judging] Automatic prize disbursement failed:`, payoutErr);
    }

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

/** Internal function to disburse hackathon prizes without requiring admin session checks */
export async function disburseHackathonPrizesInternal(hackathonId: string) {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Supabase is not configured.");
  }
  const supabase = getSupabaseServerClient();

  // 1. Fetch hackathon details
  const hackathon = await getHackathonDetail(hackathonId);
  if (!hackathon) throw new Error("Hackathon not found.");
  if (hackathon.status !== "closed") {
    throw new Error("Hackathon must be closed/judged to disburse rewards.");
  }

  // 1.5. Verify the treasury has been funded by the hoster
  if (!hackathon.treasury_address) {
    throw new Error("Treasury wallet has not been configured for this hackathon.");
  }

  const durationDays =
    hackathon.start_date && hackathon.deadline
      ? Math.ceil(
          (new Date(hackathon.deadline).getTime() - new Date(hackathon.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  const extraMonths = durationDays > 0 ? Math.floor(durationDays / 30) : 0;
  const adminFee = 10 + extraMonths;
  const requiredEscrowBalance = hackathon.prize_pool_usdc;

  const treasuryBalance = await readUsdcBalance(hackathon.treasury_address);
  if (treasuryBalance < requiredEscrowBalance) {
    throw new Error(
      `Treasury underfunded. Live balance is ${treasuryBalance} USDC, but prize escrow requires ${requiredEscrowBalance} USDC after the ${adminFee} USDC platform fee is forwarded.`,
    );
  }

  const submissions = hackathon.submissions ?? [];
  if (submissions.length === 0) {
    throw new Error("No submissions to pay out.");
  }

  const subIds = submissions.map((s) => s.id);

  // Calculate ranked leaderboard using weighted scores
  const scoreMap = await fetchWeightedScores(subIds);
  const ranked = submissions
    .map((sub) => ({
      ...sub,
      score: scoreMap.get(sub.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  const winnerSplit = hackathon.winner_split || [50, 30, 20];
  const payouts: { registrationId: string; address: string; amount: number; name: string }[] = [];

  for (let i = 0; i < winnerSplit.length; i++) {
    const percent = winnerSplit[i];
    const project = ranked[i];
    if (!project) break; // If there are fewer projects than split allocations

    const payoutAddress = project.payout_address?.trim();
    if (!payoutAddress || !/^0x[a-fA-F0-9]{40}$/.test(payoutAddress)) {
      console.warn(
        `[payout] Winner rank ${i + 1} (${project.project_name}) has no valid payout address.`,
      );
      continue;
    }

    const reward = Number(((hackathon.prize_pool_usdc * percent) / 100).toFixed(6));
    if (reward <= 0) continue;

    payouts.push({
      registrationId: project.id,
      address: payoutAddress,
      amount: reward,
      name: project.project_name,
    });
  }

  if (payouts.length === 0) {
    throw new Error("No winners with valid payout addresses found.");
  }

  // Verify if we already disbursed winner rewards
  const recipientAddresses = payouts.map((p) => p.address.toLowerCase());
  const { data: done } = await supabase
    .from("payments")
    .select("to_address")
    .eq("hackathon_id", hackathonId)
    .eq("kind", "payout")
    .in("registration_id", subIds);

  const agentWallets = new Set(
    (hackathon.agents ?? [])
      .map((a) => String(a.wallet_address || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const alreadyPaid = (done ?? []).some((p) => {
    const toAddr = String(p.to_address).toLowerCase();
    return recipientAddresses.includes(toAddr) && !agentWallets.has(toAddr);
  });

  if (alreadyPaid) {
    throw new Error("Prizes have already been disbursed for this hackathon.");
  }

  // Call the JuriXEscrow contract to disburse prizes atomically on-chain
  let txHash = "";
  try {
    const winnerAddrs = payouts.map((p) => p.address);
    const winnerAmounts = payouts.map((p) => p.amount);

    console.log(
      `[payout] Triggering escrow disbursement of prizes on-chain via JuriXEscrow for hackathon: ${hackathonId}`,
    );
    txHash = await disbursePrizesOnChain(hackathonId, winnerAddrs, winnerAmounts);
    console.log(
      `[payout] Smart contract escrow disbursement successful. Transaction hash: ${txHash}`,
    );
  } catch (contractErr) {
    console.error("[payout] Failed on-chain smart contract disbursement:", contractErr);
    throw new Error(
      `Escrow disbursement failed: ${contractErr instanceof Error ? contractErr.message : String(contractErr)}`,
    );
  }

  const results: { address: string; amount: number; txHash: string; name: string }[] = [];

  // Log the payouts as confirmed under the single transaction hash
  for (const p of payouts) {
    const { data: record, error: insErr } = await supabase
      .from("payments")
      .insert({
        kind: "payout",
        hackathon_id: hackathonId,
        registration_id: p.registrationId,
        to_address: p.address,
        amount_usdc: p.amount,
        status: "confirmed",
        circle_tx_id: txHash,
      })
      .select("id")
      .single();

    if (!insErr && record) {
      results.push({ address: p.address, amount: p.amount, txHash, name: p.name });
    }
  }

  return { success: true, paidCount: results.length, payouts: results };
}
