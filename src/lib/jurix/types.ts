export type HackathonStatus = "open" | "judging" | "closed";
export type AgentStatus = "idle" | "reviewing" | "done" | "offline";
export type SubmissionStatus = "draft" | "submitted" | "reviewing" | "complete" | "flagged";

export interface JudgeAgent {
  id: string;
  slug: string;
  name: string;
  short_code: string;
  role: string;
  focus_area: string;
  status: AgentStatus;
  color_hex: string;
  weight_percent: number;
  system_prompt: string | null;
  scoring_notes: string | null;
  wallet_address: string | null;
  created_at: string;
}

export interface JudgingCriterion {
  id: string;
  hackathon_id: string;
  agent_id: string | null;
  name: string;
  description: string | null;
  weight_percent: number;
  sort_order: number;
  created_at: string;
}

export interface HackathonSummary {
  id: string;
  name: string;
  description: string | null;
  submission_instructions: string | null;
  required_deliverables: string[];
  organizer_name: string | null;
  organizer_email: string | null;
  prize_pool_usdc: number;
  entry_fee_usdc: number;
  start_date: string | null;
  deadline: string | null;
  status: HackathonStatus;
  treasury_wallet_id: string | null;
  treasury_address: string | null;
  winner_split: number[];
  created_at: string;
  submission_count: number;
  host_user_id?: string | null;
}

export interface SubmissionScore {
  id: string;
  registration_id: string;
  criterion_id: string;
  agent_id: string;
  score: number;
  weighted_points?: number;
  confidence: number | null;
  rationale: string | null;
  evidence: string[] | null;
  flags: string[] | null;
  tx_hash?: string | null;
  payment_status?: string | null;
  fee_amount?: number | null;
  created_at: string;
}

export interface JudgingRun {
  id: string;
  hackathon_id: string;
  status: "pending" | "running" | "completed" | "failed";
  triggered_by: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface JudgingRunItem {
  id: string;
  run_id: string;
  registration_id: string;
  agent_id: string;
  criterion_id: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SubmissionSummary {
  id: string;
  hackathon_id: string;
  user_id: string | null;
  project_name: string;
  team_name: string;
  description: string | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  payout_address: string;
  entry_paid: boolean;
  status: SubmissionStatus;
  community_votes: number;
  created_at: string;
  weighted_score: number;
}

export interface HackathonDetail extends HackathonSummary {
  criteria: JudgingCriterion[];
  agents: JudgeAgent[];
  submissions: SubmissionSummary[];
}

export interface SubmissionDetail extends SubmissionSummary {
  hackathon: HackathonSummary;
  scores: SubmissionScore[];
  criteria: JudgingCriterion[];
  agents: JudgeAgent[];
}

export interface ActivityEvent {
  ts: string;
  agent_name: string;
  tone: "accent" | "warn" | "ai" | "muted";
  text: string;
}

export interface HomeStats {
  active_hackathons: number;
  total_submissions: number;
  usdc_distributed: number;
  verdicts_rendered: number;
}

export interface HomeData {
  stats: HomeStats;
  featured_hackathons: HackathonSummary[];
  active_agents: JudgeAgent[];
  recent_activity: ActivityEvent[];
  leaderboard_hackathon: HackathonSummary | null;
  leaderboard_submissions: SubmissionSummary[];
}
