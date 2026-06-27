-- JuriXAI initial schema
-- Models the payment vision: users sign up and get a Circle (Modular) wallet,
-- projects register/pay into a hackathon's treasury, and winners are paid out
-- to their personal wallets.
--
-- Run this against your Supabase project (SQL editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users: a JuriXAI account. Identity is anchored to the user's Circle wallet
-- (passkey smart account), but we also store profile basics.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  display_name  text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Wallets: a Circle Modular (user-controlled, passkey) wallet linked to a user.
-- One user can have one primary wallet for now; schema allows more later.
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  -- Circle identifiers
  circle_wallet_id  text,                       -- Circle wallet/account id (if applicable)
  smart_account     text not null,              -- on-chain smart account address (0x…)
  blockchain        text not null default 'ARB-SEPOLIA',
  passkey_cred_id   text,                       -- WebAuthn credential id used for this wallet
  is_primary        boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (user_id, smart_account)
);

-- ---------------------------------------------------------------------------
-- Hackathons: mirrors the front-end model. Each has its own treasury wallet
-- (the site's Circle wallet that receives entry payments and funds payouts).
-- ---------------------------------------------------------------------------
create table if not exists public.hackathons (
  id                 text primary key,          -- slug, e.g. 'solana-speedrun'
  name               text not null,
  description        text,
  organizer_name     text,
  organizer_email    text,
  prize_pool_usdc    numeric(18,2) not null default 0,
  entry_fee_usdc     numeric(18,2) not null default 0,
  start_date         timestamptz,
  deadline           timestamptz,
  status             text not null default 'open' check (status in ('open','judging','closed')),
  treasury_wallet_id text,                       -- Circle treasury wallet id
  treasury_address   text,                       -- on-chain treasury address
  winner_split       int[] not null default '{50,30,20}',
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Registrations: a project submitted to a hackathon by a user. Tracks whether
-- the entry payment into the treasury has been settled.
-- ---------------------------------------------------------------------------
create table if not exists public.registrations (
  id              uuid primary key default gen_random_uuid(),
  hackathon_id    text not null references public.hackathons(id) on delete cascade,
  user_id         uuid references public.users(id) on delete set null,
  project_name    text not null,
  team_name       text not null,
  description     text,
  github_url      text,
  demo_url        text,
  video_url       text,
  payout_address  text not null,                 -- where prize money should go (0x…)
  entry_paid      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments: every USDC movement — entry fees in, and prize payouts out.
-- circle_tx_id ties the row to the on-chain transaction Circle reports.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('entry','payout')),
  hackathon_id   text references public.hackathons(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  from_address   text,
  to_address     text,
  amount_usdc    numeric(18,2) not null,
  circle_tx_id   text,
  status         text not null default 'pending' check (status in ('pending','confirmed','failed')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_wallets_user on public.wallets(user_id);
create index if not exists idx_registrations_hackathon on public.registrations(hackathon_id);
create index if not exists idx_payments_hackathon on public.payments(hackathon_id);
