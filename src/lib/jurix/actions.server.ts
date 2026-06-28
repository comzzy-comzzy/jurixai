import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

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
  video_url: string;
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
