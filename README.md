# JuriXAI ⚖️

**Live at [www.jurixai.xyz](https://www.jurixai.xyz)**

JuriXAI is an on-chain hackathon hosting platform built for the Lepton Agents Hackathon. It replaces human judges with a panel of AI agents, using USDC micropayments on Arc L1 Testnet to pay agents for evaluations and distribute prize pools to winners.

The platform uses Circle Smart Accounts (SCA) to provide developer and organizer wallets.

## Features
*   **AI Judges:** 4 specialized agent profiles (Technical Quality, Product Value, Originality, and Presentation) score submissions. Scoring is deterministic (temperature 0.0).
*   **Workload-based Fees:** Agent fees are calculated dynamically based on character length of the project details and the generated response (base fee of `0.0002 USDC` + `0.000001 USDC` per character).
*   **Dynamic Explorer Links:** Clickable Arcscan transaction links appear directly under each judge's score on the project page.
*   **Escrow & Payouts:** Hackathons require organizers to deposit the total prize pool and platform fee into a treasury address before they are activated. Once judging is closed, the admin can trigger reward payouts based on the configured split (e.g. 50/30/20) in a single click.
*   **Circle Smart Accounts:** Login via email OTP and set up a PIN. Developers can withdraw their balance directly to Metamask or other external wallets by completing a PIN challenge.

## Environment Variables (.env)
Create a `.env` file in the root directory:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Circle
CIRCLE_API_KEY=your-circle-api-key
VITE_CIRCLE_APP_ID=your-circle-app-id
VITE_CIRCLE_CHAIN=ARC-TESTNET
CIRCLE_CHAIN=ARC-TESTNET

# Session
JURIX_SESSION_SECRET=some-random-secret-key

# Operator (Escrow & Gas)
JURIX_OPERATOR_PRIVATE_KEY=your-evm-private-key

# LLM Configuration
JURIX_JUDGE_PROVIDER=openai_compat
JURIX_JUDGE_BASE_URL=https://router-api.0g.ai/v1
JURIX_JUDGE_API_KEY=your-ai-router-key
JURIX_JUDGE_MODEL=glm-5.1
```

## Supabase Database Setup
Create a new SQL query in the Supabase Dashboard and run:

```sql
alter table public.judge_agents
  add column if not exists wallet_address text;

update public.judge_agents set wallet_address = '0xE6FC925Ff22e972F1D819b93b968Dc4B69ce9629' where slug = 'vex-01';
update public.judge_agents set wallet_address = '0x9F4d3272f88180154f1c97aCa3491f3Baa8EfFa1' where slug = 'kael-02';
update public.judge_agents set wallet_address = '0x126BD7Ca8268708e62fb778EeA5910855D13E73C' where slug = 'oryn-03';
update public.judge_agents set wallet_address = '0x1F996D3ecFAF4b3348451959d4f8fA8274686d53' where slug = 'zera-04';
```

## How to Run Locally
1. Install dependencies:
    ```bash
    npm install
    ```
2. Start the development server:
    ```bash
    npm run dev
    ```
3. Open `http://localhost:3000`.

## Quick Demo Flow
1. **Sign In:** Click "Sign In", input email, verify OTP, and set a PIN. This generates your Circle Smart Account (SCA).
2. **Host a Hackathon:** Go to `/create` (requires login). Set prize splits and details. Click Host.
3. **Fund Treasury:** Copy the treasury address from the hackathon page, deposit the required USDC, and the status will update to "Activated & Funded".
4. **Submit:** Log in as a developer, submit a project, and the payout address is pre-filled from your wallet.
5. **Run Judging:** In the admin page (`/admin`), click "Run judging". This triggers LLM scoring and pays agent fees on-chain.
6. **Verify Payouts:** Under each score on the project detail page, click the green "Fee Paid" link to check the transaction on Arcscan.
7. **Disburse Prizes:** In `/admin`, click "Disburse Prizes". The rewards are sent on-chain to the winners' EVM addresses.
8. **Withdraw Winnings:** Winnings will show in the user's dashboard. Go to `/profile`, click "Withdraw", type recipient address and amount, enter PIN, and the funds are sent to your external wallet.
