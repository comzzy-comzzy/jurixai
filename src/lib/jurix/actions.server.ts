import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import { getWalletSession } from "@/lib/account/session.server";
import {
  getOperatorAddress,
  registerHackathonOnChain,
  disbursePrizesOnChain,
  cancelAndRefundOnChain,
  sendUsdc,
} from "@/lib/chain.server";
import {
  getHackathonDetail,
  getHomeData,
  getSubmissionDetail,
  listHackathons,
  fetchWeightedScores,
} from "./data.server";
import { runExpiredHackathons, runHackathonJudging } from "./judging.server";
import { probeJudgeModel } from "./judge-model.server";
import { requireAdmin } from "@/lib/admin/guard.server";
import { readUsdcBalance, ESCROW_CONTRACT_ADDRESS } from "@/lib/chain";

type HackathonCriterionInput = {
  name: string;
  description: string;
  weight_percent: number;
  agent_id: string;
};

type CreateHackathonInput = {
  name: string;
  description: string;
  organizer_name: string;
  organizer_email: string;
  prize_pool_usdc: number;
  start_date: string;
  deadline: string;
  winner_split: number[];
  criteria: HackathonCriterionInput[];
};

type CreateSubmissionInput = {
  hackathon_id: string;
  project_name: string;
  team_name: string;
  description: string;
  github_url: string;
  demo_url?: string;
  video_url?: string;
  payout_address: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function ensureConfigured() {
  if (!hasSupabaseServerConfig()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

export const createHackathon = createServerFn({ method: "POST" })
  .validator((data: CreateHackathonInput) => data)
  .handler(async ({ data }) => {
    ensureConfigured();
    const session = await getWalletSession();
    const userId = session?.profile?.userId;
    if (!userId) {
      throw new Error("You must sign in or create an account to host a hackathon.");
    }
    const supabase = getSupabaseServerClient();

    if (!data.name?.trim()) throw new Error("Hackathon name is required.");
    if (!data.organizer_name?.trim()) throw new Error("Organizer name is required.");
    if (!data.organizer_email?.trim()) throw new Error("Organizer email is required.");
    if (!data.description?.trim()) throw new Error("Description is required.");
    if (!data.start_date) throw new Error("Start date is required.");
    if (!data.deadline) throw new Error("Submission deadline is required.");
    if (new Date(data.deadline) <= new Date(data.start_date)) {
      throw new Error("Submission deadline must be after the start date.");
    }
    if (data.prize_pool_usdc <= 0) {
      throw new Error("Prize pool must be greater than 0 USDC.");
    }

    const id = slugify(data.name);
    if (!id) {
      throw new Error("Hackathon name must contain at least one alphanumeric character.");
    }
    const winnerSplit = data.winner_split.filter((n) => Number.isFinite(n) && n > 0);

    let operatorAddress: string | null = null;
    if (process.env.JURIX_OPERATOR_PRIVATE_KEY) {
      try {
        operatorAddress = getOperatorAddress();
      } catch (e) {
        console.error("Failed to derive operator address for new hackathon:", e);
      }
    }

    const { data: created, error } = await supabase
      .from("hackathons")
      .insert({
        id,
        name: data.name,
        description: data.description,
        organizer_name: data.organizer_name,
        organizer_email: data.organizer_email,
        prize_pool_usdc: data.prize_pool_usdc,
        start_date: data.start_date,
        deadline: data.deadline,
        status: "open",
        winner_split: winnerSplit,
        host_user_id: userId,
        treasury_address: ESCROW_CONTRACT_ADDRESS,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const criteria = data.criteria.map((criterion, index) => ({
      hackathon_id: created.id,
      agent_id: criterion.agent_id,
      name: criterion.name,
      description: criterion.description,
      weight_percent: criterion.weight_percent,
      sort_order: index,
    }));

    const { error: criteriaError } = await supabase.from("judging_criteria").insert(criteria);
    if (criteriaError) throw new Error(criteriaError.message);

    // Register on the master JuriXEscrow smart contract.
    //
    // IMPORTANT: the on-chain step must NEVER delete the hackathon. By the time
    // we get here the host has already paid the funding into the operator wallet,
    // and the event + judging criteria are saved. If the escrow relay/registration
    // reverts, deleting the record would make the host's hackathon (and their
    // money) silently vanish — the exact "it keeps disappearing" bug. Instead we
    // keep the record, flag escrow as not-yet-registered, and let it be retried.
    let escrowRegistered = false;
    let escrowTxHash: string | null = null;
    let escrowError: string | null = null;
    try {
      const durationDays =
        data.start_date && data.deadline
          ? Math.ceil(
              (new Date(data.deadline).getTime() - new Date(data.start_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;
      const extraMonths = durationDays > 0 ? Math.floor(durationDays / 30) : 0;
      const platformFee = 10 + extraMonths;
      const totalFunding = data.prize_pool_usdc + platformFee;
      const hosterAddress = session?.wallet?.address || getOperatorAddress();

      console.log(
        `[escrow] Relaying ${totalFunding} USDC from operator wallet into escrow contract ${ESCROW_CONTRACT_ADDRESS} before registration.`,
      );
      await sendUsdc(ESCROW_CONTRACT_ADDRESS, totalFunding);

      console.log(
        `[escrow] Registering hackathon ${created.id} on-chain with hoster: ${hosterAddress}, prize pool: ${data.prize_pool_usdc} USDC, platform fee: ${platformFee} USDC`,
      );
      const txHash = await registerHackathonOnChain(
        created.id,
        hosterAddress,
        data.prize_pool_usdc,
        platformFee,
      );
      escrowRegistered = true;
      escrowTxHash = typeof txHash === "string" ? txHash : null;
    } catch (e) {
      escrowError = e instanceof Error ? e.message : String(e);
      console.error(
        `[escrow] On-chain registration failed for ${created.id}; keeping the hackathon in the database for retry:`,
        e,
      );
    }

    // Best-effort persistence of the escrow outcome. Wrapped so that a missing
    // column (migration 0006 not yet applied) can never break hosting.
    try {
      const { error: escrowStatusError } = await supabase
        .from("hackathons")
        .update({
          escrow_registered: escrowRegistered,
          escrow_tx_hash: escrowTxHash,
          escrow_error: escrowError,
        })
        .eq("id", created.id);
      if (escrowStatusError) {
        console.warn(
          "[escrow] Could not persist escrow status (is migration 0006 applied?):",
          escrowStatusError.message,
        );
      }
    } catch (e) {
      console.warn("[escrow] Unexpected error persisting escrow status:", e);
    }

    return { id: created.id, escrowRegistered };
  });

type UpdateSubmissionInput = {
  submission_id: string;
  project_name: string;
  team_name: string;
  description: string;
  github_url: string;
  demo_url?: string;
  video_url?: string;
  payout_address: string;
};

export const createSubmission = createServerFn({ method: "POST" })
  .validator((data: CreateSubmissionInput) => data)
  .handler(async ({ data }) => {
    ensureConfigured();
    const session = await getWalletSession();
    const userId = session?.profile?.userId;
    if (!userId) {
      throw new Error("You must sign in or create an account to submit a project.");
    }
    const supabase = getSupabaseServerClient();

    const { data: created, error } = await supabase
      .from("registrations")
      .insert({
        hackathon_id: data.hackathon_id,
        user_id: userId,
        project_name: data.project_name,
        team_name: data.team_name,
        description: data.description,
        github_url: data.github_url,
        demo_url: data.demo_url || null,
        video_url: data.video_url,
        payout_address: data.payout_address,
        status: "submitted",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const loadJoinedSubmissions = createServerFn({ method: "GET" }).handler(async () => {
  ensureConfigured();
  const session = await getWalletSession();
  const userId = session?.profile?.userId;
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  const { data: registrations, error } = await supabase
    .from("registrations")
    .select(
      `
      id,
      hackathon_id,
      project_name,
      team_name,
      description,
      github_url,
      demo_url,
      video_url,
      payout_address,
      entry_paid,
      status,
      created_at,
      hackathons(
        id,
        name,
        deadline,
        status,
        prize_pool_usdc
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return registrations;
});

export const loadHostedHackathons = createServerFn({ method: "GET" }).handler(async () => {
  ensureConfigured();
  const session = await getWalletSession();
  const userId = session?.profile?.userId;
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  const { data: hackathons, error } = await supabase
    .from("hackathons")
    .select(
      `
      id,
      name,
      status,
      deadline,
      prize_pool_usdc,
      created_at,
      registrations(count)
    `,
    )
    .eq("host_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (hackathons ?? []).map((row) => {
    const registrations = row.registrations as unknown;
    const submissionCount = Array.isArray(registrations)
      ? Number((registrations[0] as { count?: number } | undefined)?.count ?? 0)
      : 0;
    return {
      id: String(row.id),
      name: String(row.name),
      status: String(row.status),
      deadline: row.deadline ? String(row.deadline) : null,
      prize_pool_usdc: Number(row.prize_pool_usdc ?? 0),
      created_at: String(row.created_at),
      submission_count: submissionCount,
    };
  });
});

export const updateSubmission = createServerFn({ method: "POST" })
  .validator((data: UpdateSubmissionInput) => data)
  .handler(async ({ data }) => {
    ensureConfigured();
    const session = await getWalletSession();
    const userId = session?.profile?.userId;
    if (!userId) {
      throw new Error("You must be logged in to update your submission.");
    }

    const supabase = getSupabaseServerClient();

    // First, verify that this submission belongs to the user and is ongoing
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("id, hackathon_id, user_id, hackathons(deadline, status)")
      .eq("id", data.submission_id)
      .single();

    if (fetchError || !registration) {
      throw new Error("Submission not found.");
    }

    if (registration.user_id !== userId) {
      throw new Error("You do not have permission to edit this submission.");
    }

    const hackathon = Array.isArray(registration.hackathons)
      ? registration.hackathons[0]
      : registration.hackathons;

    if (!hackathon) {
      throw new Error("Associated hackathon not found.");
    }

    if (hackathon.status !== "open") {
      throw new Error("Cannot modify submission: hackathon is no longer open.");
    }

    if (hackathon.deadline && new Date(hackathon.deadline) < new Date()) {
      throw new Error("Cannot modify submission: deadline has passed.");
    }

    const { data: updated, error } = await supabase
      .from("registrations")
      .update({
        project_name: data.project_name,
        team_name: data.team_name,
        description: data.description,
        github_url: data.github_url,
        demo_url: data.demo_url || null,
        video_url: data.video_url || null,
        payout_address: data.payout_address,
      })
      .eq("id", data.submission_id)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: updated.id };
  });

export const setHackathonTreasury = createServerFn({ method: "POST" })
  .validator((data: { hackathon_id: string; treasury_address: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    ensureConfigured();
    const supabase = getSupabaseServerClient();
    const address = data.treasury_address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error("Enter a valid EVM wallet address (0x followed by 40 hex characters).");
    }
    const { error } = await supabase
      .from("hackathons")
      .update({ treasury_address: address })
      .eq("id", data.hackathon_id);
    if (error) throw new Error(error.message);
    return { treasury_address: address };
  });

export const testJudgeModel = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  return probeJudgeModel();
});

export const loadHomeData = createServerFn({ method: "GET" }).handler(async () => getHomeData());

export const loadHackathons = createServerFn({ method: "GET" }).handler(async () =>
  listHackathons(),
);

export const loadHackathonDetail = createServerFn({ method: "GET" })
  .validator((data: { hackathon_id: string }) => data)
  .handler(async ({ data }) => {
    const hackathon = await getHackathonDetail(data.hackathon_id);
    if (!hackathon) {
      throw new Error("Hackathon not found.");
    }
    return hackathon;
  });

export const loadSubmissionDetail = createServerFn({ method: "GET" })
  .validator((data: { hackathon_id: string; submission_id: string }) => data)
  .handler(async ({ data }) => {
    const submission = await getSubmissionDetail(data.hackathon_id, data.submission_id);
    if (!submission) {
      throw new Error("Submission not found.");
    }
    return submission;
  });

export const triggerHackathonJudging = createServerFn({ method: "POST" })
  .validator((data: { hackathon_id: string; triggered_by?: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const hackathon = await getHackathonDetail(data.hackathon_id);
    if (!hackathon) throw new Error("Hackathon not found.");
    return runHackathonJudging(hackathon, data.triggered_by ?? "admin");
  });

export const triggerExpiredHackathons = createServerFn({ method: "POST" })
  .validator((data: { triggered_by?: string } | undefined) => data)
  .handler(async ({ data }) => {
    return runExpiredHackathons(data?.triggered_by ?? "cron");
  });

/** Disburse prize pool funds on-chain to the hackathon winners based on the configured split. */
export const disburseHackathonPrizes = createServerFn({ method: "POST" })
  .validator((data: { hackathon_id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    ensureConfigured();
    const supabase = getSupabaseServerClient();

    // 1. Fetch hackathon details
    const hackathon = await getHackathonDetail(data.hackathon_id);
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
    const totalFunding = hackathon.prize_pool_usdc + adminFee;
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
      .eq("hackathon_id", data.hackathon_id)
      .eq("kind", "payout")
      .in("registration_id", subIds);

    const alreadyPaid = (done ?? []).some((p) =>
      recipientAddresses.includes(String(p.to_address).toLowerCase()),
    );

    if (alreadyPaid) {
      throw new Error("Prizes have already been disbursed for this hackathon.");
    }

    // Call the JuriXEscrow contract to disburse prizes atomically on-chain
    let txHash = "";
    try {
      const winnerAddrs = payouts.map((p) => p.address);
      const winnerAmounts = payouts.map((p) => p.amount);

      console.log(
        `[payout] Triggering escrow disbursement of prizes on-chain via JuriXEscrow for hackathon: ${data.hackathon_id}`,
      );
      txHash = await disbursePrizesOnChain(data.hackathon_id, winnerAddrs, winnerAmounts);
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
          hackathon_id: data.hackathon_id,
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
  });

type UpdateHackathonInput = {
  hackathon_id: string;
  name: string;
  description: string;
  organizer_name: string;
  organizer_email: string;
  start_date: string;
  deadline: string;
};

export const updateHackathon = createServerFn({ method: "POST" })
  .validator((data: UpdateHackathonInput) => data)
  .handler(async ({ data }) => {
    ensureConfigured();
    const session = await getWalletSession();
    const userId = session?.profile?.userId;
    if (!userId) {
      throw new Error("You must sign in to edit this hackathon.");
    }
    if (!data.name?.trim()) throw new Error("Hackathon name is required.");
    if (!data.organizer_name?.trim()) throw new Error("Organizer name is required.");
    if (!data.organizer_email?.trim()) throw new Error("Organizer email is required.");
    if (!data.description?.trim()) throw new Error("Description is required.");
    if (!data.start_date) throw new Error("Start date is required.");
    if (!data.deadline) throw new Error("Submission deadline is required.");
    if (new Date(data.deadline) <= new Date(data.start_date)) {
      throw new Error("Submission deadline must be after the start date.");
    }

    const supabase = getSupabaseServerClient();

    // Verify host
    const { data: hackathon, error: fetchError } = await supabase
      .from("hackathons")
      .select("host_user_id, status")
      .eq("id", data.hackathon_id)
      .single();

    if (fetchError || !hackathon) {
      throw new Error("Hackathon not found.");
    }

    if (hackathon.host_user_id !== userId) {
      throw new Error("You do not have permission to edit this hackathon.");
    }

    if (hackathon.status !== "open") {
      throw new Error("Cannot edit a hackathon that is no longer open.");
    }

    const { error: updateError } = await supabase
      .from("hackathons")
      .update({
        name: data.name,
        description: data.description,
        organizer_name: data.organizer_name,
        organizer_email: data.organizer_email,
        start_date: data.start_date,
        deadline: data.deadline,
      })
      .eq("id", data.hackathon_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { success: true };
  });

export const deleteHackathon = createServerFn({ method: "POST" })
  .validator((data: { hackathon_id: string }) => data)
  .handler(async ({ data }) => {
    ensureConfigured();
    const session = await getWalletSession();
    const userId = session?.profile?.userId;
    if (!userId) {
      throw new Error("You must sign in to delete this hackathon.");
    }
    const supabase = getSupabaseServerClient();

    // Verify host
    const { data: hackathon, error: fetchError } = await supabase
      .from("hackathons")
      .select("host_user_id")
      .eq("id", data.hackathon_id)
      .single();

    if (fetchError || !hackathon) {
      throw new Error("Hackathon not found.");
    }

    if (hackathon.host_user_id !== userId) {
      throw new Error("You do not have permission to delete this hackathon.");
    }

    // Trigger on-chain smart contract refund for the prize pool
    try {
      console.log(
        `[escrow] Triggering on-chain cancel and refund for hackathon: ${data.hackathon_id}`,
      );
      const txHash = await cancelAndRefundOnChain(data.hackathon_id);
      console.log(`[escrow] Escrow cancel and refund successful. Transaction hash: ${txHash}`);
    } catch (contractErr) {
      console.warn("[escrow] On-chain cancel/refund failed or not registered:", contractErr);
      const errMsg = contractErr instanceof Error ? contractErr.message : String(contractErr);
      if (errMsg.includes("finalized") || errMsg.includes("Already finalized")) {
        throw new Error("Cannot delete hackathon: prizes have already been disbursed or refunded.");
      }
    }

    const { error: deleteError } = await supabase
      .from("hackathons")
      .delete()
      .eq("id", data.hackathon_id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return { success: true };
  });

export const getOperatorWalletAddress = createServerFn({ method: "GET" }).handler(async () => {
  ensureConfigured();
  return getOperatorAddress();
});

export const getOperatorUsdcBalance = createServerFn({ method: "GET" }).handler(async () => {
  ensureConfigured();
  return readUsdcBalance(getOperatorAddress());
});
