alter table public.payments
  alter column amount_usdc type numeric(18,6)
  using amount_usdc::numeric(18,6);

create unique index if not exists idx_payments_x402_replay_key
  on public.payments(circle_tx_id)
  where circle_tx_id like 'x402:%';
