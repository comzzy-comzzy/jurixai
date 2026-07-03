import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import type {
  ActivityEvent,
  HackathonDetail,
  HackathonSummary,
  HomeData,
  JudgeAgent,
  JudgingCriterion,
  SubmissionDetail,
  SubmissionScore,
  SubmissionSummary,
} from "./types";

const FALLBACK_AGENTS: JudgeAgent[] = [
  {
    id: "fallback-vex",
    slug: "vex-01",
    name: "Vex",
    short_code: "VX",
    role: "Code Judge",
    focus_area: "Code quality, correctness, maintainability, and security basics.",
    status: "idle",
    color_hex: "#00D8C8",
    weight_percent: 35,
    system_prompt: null,
    scoring_notes: null,
    wallet_address: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "fallback-kael",
    slug: "kael-02",
    name: "Kael",
    short_code: "KL",
    role: "Product Judge",
    focus_area: "Problem clarity, UX, user value, and product completeness.",
    status: "idle",
    color_hex: "#3B82F6",
    weight_percent: 25,
    system_prompt: null,
    scoring_notes: null,
    wallet_address: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "fallback-oryn",
    slug: "oryn-03",
    name: "Oryn",
    short_code: "OR",
    role: "Innovation Judge",
    focus_area: "Originality, ambition, and differentiated thinking.",
    status: "idle",
    color_hex: "#7C3AED",
    weight_percent: 20,
    system_prompt: null,
    scoring_notes: null,
    wallet_address: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "fallback-zera",
    slug: "zera-04",
    name: "Zera",
    short_code: "ZR",
    role: "Delivery Judge",
    focus_area: "Documentation, reproducibility, polish, and shipping quality.",
    status: "idle",
    color_hex: "#EF4444",
    weight_percent: 20,
    system_prompt: null,
    scoring_notes: null,
    wallet_address: null,
    created_at: new Date(0).toISOString(),
  },
];

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function parseHackathonContent(description: string | null): {
  summary: string | null;
  submissionInstructions: string | null;
  requiredDeliverables: string[];
} {
  if (!description) {
    return {
      summary: null,
      submissionInstructions: null,
      requiredDeliverables: [],
    };
  }

  const instructionsMarker = "\n\nSubmission Instructions:\n";
  const deliverablesMarker = "\n\nRequired Deliverables:\n";
  const instructionsIndex = description.indexOf(instructionsMarker);

  if (instructionsIndex === -1) {
    return {
      summary: description.trim() || null,
      submissionInstructions: null,
      requiredDeliverables: [],
    };
  }

  const summary = description.slice(0, instructionsIndex).trim() || null;
  const afterInstructions = description.slice(instructionsIndex + instructionsMarker.length);
  const deliverablesIndex = afterInstructions.indexOf(deliverablesMarker.trimStart());

  if (deliverablesIndex === -1) {
    return {
      summary,
      submissionInstructions: afterInstructions.trim() || null,
      requiredDeliverables: [],
    };
  }

  const submissionInstructions = afterInstructions.slice(0, deliverablesIndex).trim() || null;
  const deliverablesText = afterInstructions
    .slice(deliverablesIndex + deliverablesMarker.trimStart().length)
    .trim();

  const requiredDeliverables = deliverablesText
    .split(/\r?\n/)
    .map((item) => item.replace(/^-+\s*/, "").trim())
    .filter(Boolean);

  return {
    summary,
    submissionInstructions,
    requiredDeliverables,
  };
}

function normalizeHackathon(row: Record<string, unknown>, submissionCount = 0): HackathonSummary {
  const parsed = parseHackathonContent(row.description ? String(row.description) : null);
  return {
    id: String(row.id),
    name: String(row.name),
    description: parsed.summary,
    submission_instructions: parsed.submissionInstructions,
    required_deliverables: parsed.requiredDeliverables,
    organizer_name: row.organizer_name ? String(row.organizer_name) : null,
    organizer_email: row.organizer_email ? String(row.organizer_email) : null,
    prize_pool_usdc: toNumber(row.prize_pool_usdc),
    entry_fee_usdc: toNumber(row.entry_fee_usdc),
    start_date: row.start_date ? String(row.start_date) : null,
    deadline: row.deadline ? String(row.deadline) : null,
    status: String(row.status) as HackathonSummary["status"],
    treasury_wallet_id: row.treasury_wallet_id ? String(row.treasury_wallet_id) : null,
    treasury_address: row.treasury_address ? String(row.treasury_address) : null,
    winner_split: Array.isArray(row.winner_split) ? row.winner_split.map(toNumber) : [],
    created_at: String(row.created_at),
    submission_count: submissionCount,
  };
}

function normalizeAgent(row: Record<string, unknown>): JudgeAgent {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    short_code: String(row.short_code),
    role: String(row.role),
    focus_area: String(row.focus_area),
    status: String(row.status) as JudgeAgent["status"],
    color_hex: String(row.color_hex),
    weight_percent: toNumber(row.weight_percent),
    system_prompt: row.system_prompt ? String(row.system_prompt) : null,
    scoring_notes: row.scoring_notes ? String(row.scoring_notes) : null,
    wallet_address: row.wallet_address ? String(row.wallet_address) : null,
    created_at: String(row.created_at),
  };
}

function normalizeCriterion(row: Record<string, unknown>): JudgingCriterion {
  return {
    id: String(row.id),
    hackathon_id: String(row.hackathon_id),
    agent_id: row.agent_id ? String(row.agent_id) : null,
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    weight_percent: toNumber(row.weight_percent),
    sort_order: toNumber(row.sort_order),
    created_at: String(row.created_at),
  };
}

function normalizeSubmission(row: Record<string, unknown>, weightedScore = 0): SubmissionSummary {
  return {
    id: String(row.id),
    hackathon_id: String(row.hackathon_id),
    user_id: row.user_id ? String(row.user_id) : null,
    project_name: String(row.project_name),
    team_name: String(row.team_name),
    description: row.description ? String(row.description) : null,
    github_url: row.github_url ? String(row.github_url) : null,
    demo_url: row.demo_url ? String(row.demo_url) : null,
    video_url: row.video_url ? String(row.video_url) : null,
    payout_address: String(row.payout_address),
    entry_paid: Boolean(row.entry_paid),
    status: String(row.status ?? "submitted") as SubmissionSummary["status"],
    community_votes: toNumber(row.community_votes ?? 0),
    created_at: String(row.created_at),
    weighted_score: weightedScore,
  };
}

function normalizeScore(row: Record<string, unknown>): SubmissionScore {
  const score = toNumber(row.score);
  const criterionWeight = toNumber(
    (row.criterion as { weight_percent?: unknown } | null)?.weight_percent ?? 0,
  );
  return {
    id: String(row.id),
    registration_id: String(row.registration_id),
    criterion_id: String(row.criterion_id),
    agent_id: String(row.agent_id),
    score,
    weighted_points: (score / 10) * criterionWeight,
    confidence: row.confidence == null ? null : toNumber(row.confidence),
    rationale: row.rationale ? String(row.rationale) : null,
    evidence: Array.isArray(row.evidence) ? row.evidence.map(String) : null,
    flags: Array.isArray(row.flags) ? row.flags.map(String) : null,
    created_at: String(row.created_at),
  };
}

async function fetchSubmissionCounts(hackathonIds: string[]) {
  if (hackathonIds.length === 0) return new Map<string, number>();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("hackathon_id")
    .in("hackathon_id", hackathonIds);

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = String(row.hackathon_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export async function fetchWeightedScores(registrationIds: string[]) {
  const supabase = getSupabaseServerClient();
  const scoreMap = new Map<string, number>();
  if (registrationIds.length === 0) return scoreMap;

  const { data: scores, error } = await supabase
    .from("submission_scores")
    .select("registration_id, score, criterion:judging_criteria(weight_percent)")
    .in("registration_id", registrationIds);

  if (error) throw new Error(error.message);

  for (const row of scores ?? []) {
    const registrationId = String(row.registration_id);
    const weight = toNumber(
      (row.criterion as { weight_percent?: unknown } | null)?.weight_percent ?? 0,
    );
    const weighted = (toNumber(row.score) / 10) * weight;
    scoreMap.set(registrationId, (scoreMap.get(registrationId) ?? 0) + weighted);
  }

  return scoreMap;
}

export function isLiveDataConfigured(): boolean {
  return hasSupabaseServerConfig();
}

export async function getHomeData(): Promise<HomeData> {
  if (!hasSupabaseServerConfig()) {
    return {
      stats: {
        active_hackathons: 0,
        total_submissions: 0,
        usdc_distributed: 0,
        verdicts_rendered: 0,
      },
      featured_hackathons: [],
      active_agents: FALLBACK_AGENTS,
      recent_activity: [],
      leaderboard_hackathon: null,
      leaderboard_submissions: [],
    };
  }

  try {
    const supabase = getSupabaseServerClient();
    const [
      { data: hackathons, error: hackathonError },
      { data: agents, error: agentError },
      { data: scores, error: scoreError },
    ] = await Promise.all([
      supabase.from("hackathons").select("*").order("created_at", { ascending: false }).limit(6),
      supabase.from("judge_agents").select("*").order("weight_percent", { ascending: false }),
      supabase
        .from("submission_scores")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (hackathonError) throw new Error(hackathonError.message);
    if (agentError) throw new Error(agentError.message);
    if (scoreError) throw new Error(scoreError.message);

    const hackathonIds = (hackathons ?? []).map((row) => String(row.id));
    const counts = await fetchSubmissionCounts(hackathonIds);
    const featured = (hackathons ?? []).map((row) =>
      normalizeHackathon(row as Record<string, unknown>, counts.get(String(row.id)) ?? 0),
    );

    const totalSubmissions = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    const activeHackathons = featured.filter((h) => h.status === "open").length;
    const verdictsRendered = (scores ?? []).length;

    let leaderboardHackathon: HackathonSummary | null = featured[0] ?? null;
    let leaderboardSubmissions: SubmissionSummary[] = [];

    if (leaderboardHackathon) {
      const { data: registrations, error: registrationError } = await supabase
        .from("registrations")
        .select("*")
        .eq("hackathon_id", leaderboardHackathon.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (registrationError) throw new Error(registrationError.message);

      const registrationIds = (registrations ?? []).map((row) => String(row.id));
      const weighted = await fetchWeightedScores(registrationIds);
      leaderboardSubmissions = (registrations ?? [])
        .map((row) =>
          normalizeSubmission(row as Record<string, unknown>, weighted.get(String(row.id)) ?? 0),
        )
        .sort((a, b) => b.weighted_score - a.weighted_score);
    }

    const recentActivity: ActivityEvent[] = (scores ?? []).map((row, index) => ({
      ts: new Date(String(row.created_at)).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      agent_name: (agents ?? [])[index % Math.max(1, (agents ?? []).length)]?.name ?? "Agent",
      tone: index % 3 === 0 ? "accent" : index % 3 === 1 ? "ai" : "warn",
      text:
        index % 2 === 0
          ? "Recorded a scoring pass for a live submission."
          : "Updated evaluation evidence and confidence.",
    }));

    const normalizedAgents =
      (agents ?? []).length > 0
        ? (agents ?? []).map((row) => normalizeAgent(row as Record<string, unknown>))
        : FALLBACK_AGENTS;

    return {
      stats: {
        active_hackathons: activeHackathons,
        total_submissions: totalSubmissions,
        usdc_distributed: 0,
        verdicts_rendered: verdictsRendered,
      },
      featured_hackathons: featured,
      active_agents: normalizedAgents,
      recent_activity: recentActivity,
      leaderboard_hackathon: leaderboardHackathon,
      leaderboard_submissions: leaderboardSubmissions,
    };
  } catch (error) {
    console.error("getHomeData fallback:", error);
    return {
      stats: {
        active_hackathons: 0,
        total_submissions: 0,
        usdc_distributed: 0,
        verdicts_rendered: 0,
      },
      featured_hackathons: [],
      active_agents: FALLBACK_AGENTS,
      recent_activity: [],
      leaderboard_hackathon: null,
      leaderboard_submissions: [],
    };
  }
}

export async function listHackathons(): Promise<HackathonSummary[]> {
  if (!hasSupabaseServerConfig()) return [];

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("hackathons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((row) => String(row.id));
  const counts = await fetchSubmissionCounts(ids);
  return (data ?? []).map((row) =>
    normalizeHackathon(row as Record<string, unknown>, counts.get(String(row.id)) ?? 0),
  );
}

export async function getHackathonDetail(id: string): Promise<HackathonDetail | null> {
  if (!hasSupabaseServerConfig()) return null;

  const supabase = getSupabaseServerClient();
  const [
    { data: hackathon, error: hackathonError },
    { data: criteria, error: criteriaError },
    { data: agents, error: agentsError },
    { data: submissions, error: submissionsError },
  ] = await Promise.all([
    supabase.from("hackathons").select("*").eq("id", id).maybeSingle(),
    supabase.from("judging_criteria").select("*").eq("hackathon_id", id).order("sort_order"),
    supabase.from("judge_agents").select("*").order("weight_percent", { ascending: false }),
    supabase
      .from("registrations")
      .select("*")
      .eq("hackathon_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (hackathonError) throw new Error(hackathonError.message);
  if (criteriaError) throw new Error(criteriaError.message);
  if (agentsError) throw new Error(agentsError.message);
  if (submissionsError) throw new Error(submissionsError.message);
  if (!hackathon) return null;

  const submissionIds = (submissions ?? []).map((row) => String(row.id));
  const weighted = await fetchWeightedScores(submissionIds);
  const submissionList = (submissions ?? [])
    .map((row) =>
      normalizeSubmission(row as Record<string, unknown>, weighted.get(String(row.id)) ?? 0),
    )
    .sort((a, b) => b.weighted_score - a.weighted_score);

  const normalizedAgents =
    (agents ?? []).length > 0
      ? (agents ?? []).map((row) => normalizeAgent(row as Record<string, unknown>))
      : FALLBACK_AGENTS;

  return {
    ...normalizeHackathon(hackathon as Record<string, unknown>, submissionList.length),
    criteria: (criteria ?? []).map((row) => normalizeCriterion(row as Record<string, unknown>)),
    agents: normalizedAgents,
    submissions: submissionList,
  };
}

export async function getSubmissionDetail(
  hackathonId: string,
  submissionId: string,
): Promise<SubmissionDetail | null> {
  if (!hasSupabaseServerConfig()) return null;

  const detail = await getHackathonDetail(hackathonId);
  if (!detail) return null;

  const supabase = getSupabaseServerClient();
  const [
    { data: submission, error: submissionError },
    { data: scores, error: scoresError },
    { data: payments, error: paymentsError }
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .eq("id", submissionId)
      .maybeSingle(),
    supabase
      .from("submission_scores")
      .select("*, criterion:judging_criteria(weight_percent)")
      .eq("registration_id", submissionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("registration_id", submissionId)
      .eq("kind", "payout"),
  ]);

  if (submissionError) throw new Error(submissionError.message);
  if (scoresError) throw new Error(scoresError.message);
  if (paymentsError) throw new Error(paymentsError.message);
  if (!submission) return null;

  const weighted = await fetchWeightedScores([submissionId]);
  const { criteria: _c, agents: _a, submissions: _s, ...hackathonSummary } = detail;

  // Map each score to its matching payment (by agent's wallet address)
  const normalizedScores = (scores ?? []).map((row) => {
    const score = normalizeScore(row as Record<string, unknown>);
    const agent = detail.agents.find((a) => a.id === score.agent_id);
    if (agent && agent.wallet_address) {
      const match = (payments ?? []).find(
        (p) => String(p.to_address).toLowerCase() === String(agent.wallet_address).toLowerCase()
      );
      if (match) {
        score.tx_hash = match.circle_tx_id || null;
        score.payment_status = match.status || null;
        score.fee_amount = match.amount_usdc != null ? Number(match.amount_usdc) : null;
      }
    }
    return score;
  });

  return {
    ...normalizeSubmission(submission as Record<string, unknown>, weighted.get(submissionId) ?? 0),
    hackathon: hackathonSummary,
    criteria: detail.criteria,
    agents: detail.agents,
    scores: normalizedScores,
  };
}
