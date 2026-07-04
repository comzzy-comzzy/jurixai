# JuriXAI ⚖️

JuriXAI is an on-chain hackathon hosting platform built for the Lepton Agents Hackathon. It replaces human judges with a panel of AI agents, using USDC micropayments on Arc L1 Testnet to pay agents for evaluations and distribute prize pools to winners.

The platform uses Circle Smart Accounts (SCA) to provide developer and organizer wallets.

## Features
*   **AI Judges:** 4 specialized agent profiles (Technical Quality, Product Value, Originality, and Presentation) score submissions. Scoring is deterministic (temperature 0.0).
*   **Workload-based Fees:** Agent fees are calculated dynamically based on character length of the project details and the generated response (base fee of `0.0002 USDC` + `0.000001 USDC` per character).
*   **Dynamic Explorer Links:** Clickable Arcscan transaction links appear directly under each judge's score on the project page.
*   **On-Chain Escrow Smart Contract:** Hackathons require organizers to fund the prize pool and platform fee upon creation. The funds are sent to a secure **`JuriXEscrow`** smart contract on-chain. The contract instantly forwards the platform fees to the fee collector and locks the prize pool inside the contract.
*   **Atomic Prize Payouts:** Once judging is closed, the admin can trigger payouts. The smart contract distributes the locked rewards atomically in a single contract call to the winners EVM addresses based on the configured split (e.g. 50/30/20).
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
JURIX_FEE_COLLECTOR=your-evm-fee-collector-address

# LLM Configuration
JURIX_JUDGE_PROVIDER=openai_compat
JURIX_JUDGE_BASE_URL=https://router-api.0g.ai/v1
JURIX_JUDGE_API_KEY=your-ai-router-key
JURIX_JUDGE_MODEL=glm-5.1
```

## Smart Contract Escrow (JuriXEscrow)
The platform uses a master escrow contract deployed on **Arc Testnet** at:
`0x89db74b925f694ebec1118cff9b08a1afe528785`

The Solidity source code for the escrow is located at `scripts/deploy-escrow.ts`.

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
    pnpm install
    ```
2. Start the development server:
    ```bash
    npm run dev
    ```
3. Open `http://localhost:3000`.

## Quick Demo Flow
1. **Sign In:** Click "Sign In", input email, verify OTP, and set a PIN. This generates your Circle Smart Account (SCA).
2. **Host a Hackathon:** Go to `/create` (requires login). Set prize splits and details.
3. **Execute Payment:** Upon clicking "Deploy Hackathon", verify your smart account balance, execute the on-chain transfer directly to the smart contract escrow, and authorize it. The hackathon will be deployed and fully funded immediately.
4. **Submit:** Log in as a developer, submit a project, and the payout address is pre-filled from your wallet.
5. **Run Judging:** In the admin page (`/admin`), click "Run judging". This triggers LLM scoring and pays agent fees on-chain.
6. **Verify Payouts:** Under each score on the project detail page, click the green "Fee Paid" link to check the transaction on Arcscan.
7. **Disburse Prizes:** In `/admin`, click "Disburse Prizes". The smart contract escrow will atomically distribute rewards to the winners on-chain in a single transaction.
8. **Withdraw Winnings:** Winnings will show in the user's dashboard. Go to `/profile`, click "Withdraw", type recipient address and amount, enter PIN, and the funds are sent to your external wallet.

## Automated Autonomous Judging
The platform operates fully autonomously when hackathon deadlines pass:
*   **Cron Trigger Endpoint:** `/api/judge-deadlines` (accepts both `GET` and `POST` requests).
*   **Vercel Crons:** Configured in `vercel.json` to automatically invoke the endpoint every 10 minutes.
*   **Logic:** The endpoint triggers `runExpiredHackathons()`, which retrieves all `open` hackathons where the deadline is in the past, spins up the LLM evaluation runs, saves the scores, and updates the status to trigger automatic payouts.

