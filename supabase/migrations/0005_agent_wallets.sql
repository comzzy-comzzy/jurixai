-- Migration to add wallet_address to judge_agents
alter table public.judge_agents
  add column if not exists wallet_address text;

-- Seed existing judge agents with placeholder EVM addresses
update public.judge_agents set wallet_address = '0x1111111111111111111111111111111111111111' where slug = 'vex-01';
update public.judge_agents set wallet_address = '0x2222222222222222222222222222222222222222' where slug = 'kael-02';
update public.judge_agents set wallet_address = '0x3333333333333333333333333333333333333333' where slug = 'oryn-03';
update public.judge_agents set wallet_address = '0x4444444444444444444444444444444444444444' where slug = 'zera-04';
