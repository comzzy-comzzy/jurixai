-- JuriXAI judging foundation
-- Adds real AI judge agents, hackathon criteria, submission status, and
-- per-agent scoring records so the UI can stop relying on mock data.

alter table public.registrations
  add column if not exists status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'reviewing', 'complete', 'flagged')),
  add column if not exists community_votes integer not null default 0;

create table if not exists public.judge_agents (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null unique,
  short_code      text not null unique,
  role            text not null,
  focus_area      text not null,
  status          text not null default 'idle'
    check (status in ('idle', 'reviewing', 'done', 'offline')),
  color_hex       text not null,
  weight_percent  numeric(6,2) not null default 25,
  system_prompt   text,
  scoring_notes   text,
  created_at      timestamptz not null default now()
);

create table if not exists public.judging_criteria (
  id              uuid primary key default gen_random_uuid(),
  hackathon_id    text not null references public.hackathons(id) on delete cascade,
  agent_id        uuid references public.judge_agents(id) on delete set null,
  name            text not null,
  description     text,
  weight_percent  numeric(6,2) not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.submission_scores (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  criterion_id    uuid not null references public.judging_criteria(id) on delete cascade,
  agent_id        uuid not null references public.judge_agents(id) on delete cascade,
  score           numeric(5,2) not null,
  confidence      numeric(5,2),
  rationale       text,
  evidence        text[] not null default '{}',
  flags           text[] not null default '{}',
  created_at      timestamptz not null default now(),
  unique (registration_id, criterion_id, agent_id)
);

create index if not exists idx_judging_criteria_hackathon on public.judging_criteria(hackathon_id);
create index if not exists idx_submission_scores_registration on public.submission_scores(registration_id);
create index if not exists idx_submission_scores_agent on public.submission_scores(agent_id);

insert into public.judge_agents (slug, name, short_code, role, focus_area, status, color_hex, weight_percent, system_prompt, scoring_notes)
values
  ('vex-01', 'Vex', 'VX', 'Code Judge', 'Code quality, correctness, maintainability, and security basics.', 'idle', '#00D8C8', 35, 'Review the repository for code quality, correctness, test coverage, and maintainability. Penalize shallow prototypes and unverified claims.', 'Require concrete evidence from repo structure, implementation details, and testability.'),
  ('kael-02', 'Kael', 'KL', 'Product Judge', 'Problem clarity, UX, user value, and product completeness.', 'idle', '#3B82F6', 25, 'Judge the usefulness of the project, UX quality, and whether the team solved a real problem end to end.', 'Favor real user journeys and complete demos over pitch-heavy concepts.'),
  ('oryn-03', 'Oryn', 'OR', 'Innovation Judge', 'Originality, ambition, and differentiated thinking.', 'idle', '#7C3AED', 20, 'Assess novelty and whether the implementation shows a non-obvious, defensible approach.', 'Do not reward buzzwords. Reward differentiated execution and architectural boldness.'),
  ('zera-04', 'ZR', 'Delivery Judge', 'Documentation, reproducibility, polish, and shipping quality.', 'idle', '#EF4444', 20, 'Check if the project is actually shipped: repo quality, README completeness, video clarity, and reproducibility.', 'Broken demos, dead links, and missing instructions should materially reduce the score.')
on conflict (slug) do update set
  name = excluded.name,
  short_code = excluded.short_code,
  role = excluded.role,
  focus_area = excluded.focus_area,
  status = excluded.status,
  color_hex = excluded.color_hex,
  weight_percent = excluded.weight_percent,
  system_prompt = excluded.system_prompt,
  scoring_notes = excluded.scoring_notes;
