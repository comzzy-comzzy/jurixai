-- JuriXAI: track on-chain escrow registration status per hackathon.
-- A hackathon is created and kept in the database even if the on-chain escrow
-- registration fails, so the host never loses their event. These columns record
-- whether escrow succeeded so it can be surfaced and retried.

alter table public.hackathons
  add column if not exists escrow_registered boolean not null default false,
  add column if not exists escrow_tx_hash text,
  add column if not exists escrow_error text;
