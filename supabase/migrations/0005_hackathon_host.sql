-- JuriXAI: tie every hackathon to the host account that created it.
-- Lets hosts see "hackathons I host" on their dashboard and gives each event a
-- verified owner. (registrations.user_id already links participants from 0001.)

alter table public.hackathons
  add column if not exists host_user_id uuid references public.users(id) on delete set null;

create index if not exists idx_hackathons_host on public.hackathons(host_user_id);
