-- Copy this whole file into Supabase SQL Editor and run it.
-- This is migration 0003.

-- JuriXAI judging execution workflow
-- Tracks when a hackathon enters judging, which submissions were processed,
-- and each agent's execution state for a given judging pass.

create table if not exists public.judging_runs (
  id              uuid primary key default gen_random_uuid(),
  hackathon_id    text not null references public.hackathons(id) on delete cascade,
  status          text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  triggered_by    text not null default 'system',
  started_at      timestamptz,
  completed_at    timestamptz,
  error_message   text,
  created_at      timestamptz not null default now()
);

create table if not exists public.judging_run_items (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.judging_runs(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  agent_id        uuid not null references public.judge_agents(id) on delete cascade,
  criterion_id    uuid not null references public.judging_criteria(id) on delete cascade,
  status          text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  started_at      timestamptz,
  completed_at    timestamptz,
  error_message   text,
  created_at      timestamptz not null default now(),
  unique (run_id, registration_id, agent_id, criterion_id)
);

create index if not exists idx_judging_runs_hackathon on public.judging_runs(hackathon_id);
create index if not exists idx_judging_run_items_run on public.judging_run_items(run_id);
create index if not exists idx_judging_run_items_registration on public.judging_run_items(registration_id);
