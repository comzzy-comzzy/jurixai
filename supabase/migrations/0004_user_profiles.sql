alter table public.users
add column if not exists auth_method text not null default 'email'
check (auth_method in ('email', 'passkey'));

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  bio text,
  location text,
  website text,
  payout_evm_address text,
  payout_chain text,
  updated_at timestamptz not null default now()
);
