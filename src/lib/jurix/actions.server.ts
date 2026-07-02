import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import { getHackathonDetail, getHomeData, getSubmissionDetail, listHackathons } from "./data.server";
import { runExpiredHackathons, runHackathonJudging } from "./judging.server";
import { probeJudgeModel } from "./judge-model.server";

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
    const supabase = getSupabaseServerClient();

    const id = slugify(data.name);
    const winnerSplit = data.winner_split.filter((n) => Number.isFinite(n) && n > 0);

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

    return { id: created.id };
  });

export const createSubmission = createServerFn({ method: "POST" })
  .validator((data: CreateSubmissionInput) => data)
  .handler(async ({ data }) => {
    ensureConfigured();
    const supabase = getSupabaseServerClient();

    const { data: created, error } = await supabase
      .from("registrations")
      .insert({
        hackathon_id: data.hackathon_id,
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

export const setHackathonTreasury = createServerFn({ method: "POST" })
  .validator((data: { hackathon_id: string; treasury_address: string }) => data)
  .handler(async ({ data }) => {
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

export const testJudgeModel = createServerFn({ method: "POST" }).handler(async () =>
  probeJudgeModel(),
);

export const loadHomeData = createServerFn({ method: "GET" }).handler(async () => getHomeData());

export const loadHackathons = createServerFn({ method: "GET" }).handler(async () => listHackathons());

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
    const hackathon = await getHackathonDetail(data.hackathon_id);
    if (!hackathon) throw new Error("Hackathon not found.");
    return runHackathonJudging(hackathon, data.triggered_by ?? "admin");
  });

export const triggerExpiredHackathons = createServerFn({ method: "POST" })
  .validator((data: { triggered_by?: string } | undefined) => data)
  .handler(async ({ data }) => {
    return runExpiredHackathons(data?.triggered_by ?? "cron");
  });
