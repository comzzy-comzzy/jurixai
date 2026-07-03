# JuriXAI ⚖️🤖

JuriXAI is a fully decentralized, autonomous hackathon hosting platform designed for the **Lepton Agents Hackathon**. It completely replaces human judges with a panel of specialized AI Agent judges, utilizing programmatic **EVM Agent Nanopayments** and secure on-chain escrow to evaluate project submissions and disburse rewards transparently.

Built on the **Arc L1 Testnet**, JuriXAI leverages **Circle's Smart Accounts (SCA)** to provide developers and organizers with secure, user-controlled cryptographic identities, turning hackathons into frictionless, trustless, and instant developer events.

---

## 🚀 Key Features

### 🤖 1. Autonomous AI Judge Panel
JuriXAI removes human bias, scheduling bottlenecks, and evaluation inconsistencies by deploying a panel of 4 specialized AI Judges:
*   **Vex (Technical Quality - Code Judge):** Audits code complexity, security, test coverage, and repository structure.
*   **Kael (Product Value - Product Judge):** Evaluates user experience, design appeal, target audience fit, and problem-solving utility.
*   **Oryn (Originality - Innovation Judge):** Assesses creative uniqueness, novelty, competitive advantage, and creative execution.
*   **Zera (Documentation & Delivery - Presentation Judge):** Inspects readmes, install scripts, and walkthrough video/demo delivery.

*Note: All judges run on low-temperature (0.0) reasoning models, guaranteeing fully deterministic, reproducible scoring.*

### 💸 2. Programmatic Agent Nanopayments
AI judges operate on a pay-per-evaluation model aligned with the hackathon's **RFB 03 (Agent-to-Agent Nanopayment Networks)** criteria:
*   **Dynamic Workload-Based Pricing:** Evaluation fees are calculated dynamically based on compute size. The formula uses a base fee of `0.0002 USDC` plus `0.000001 USDC` (1 Lepton) per character of input text (submission description) and output text (agent rationale).
*   **Sequential Queue Execution:** Micro-payments are processed sequentially in a promise-lock queue to prevent EVM nonce collisions and ensure transaction ordering.
*   **On-chain Settlement:** Operator funds transfer native USDC on the Arc L1 network directly to each judge's EVM wallet address.

### 🔗 3. Escrow & Prize Pool Disbursement
*   **Treasury Activation:** When a hoster creates a hackathon, it remains in a `"Pending Funding"` state until the live, on-chain balance of the Treasury wallet matches the required Prize Pool + platform fees.
*   **Self-Healing Escrow Disbursals:** Once judging is closed, the admin can trigger reward payouts with a single click. The backend calculates split portions (e.g. 50% for 1st, 30% for 2nd, 20% for 3rd), verifies the treasury is fully funded, and disburses payouts sequentially on-chain. It is resumption-safe and resume-safe; if interrupted, it skips already-paid winners.

### 🛡️ 4. Circle Smart Accounts & Web3 Services
*   **User-Controlled Wallets:** Developers log in via email OTP and PIN to secure their profiles with Circle Web3 Smart Accounts (SCA).
*   **Secure Withdrawals:** Users can withdraw their USDC balance directly to any external EVM address (e.g., MetaMask). This triggers a secure email OTP verification overlay handled by the Circle client Web SDK and signs the on-chain transfer via the user's PIN challenge.
*   **Creation Security:** Hackathon creators must authenticate with a Circle Smart Account before they can host an event, automatically pre-filling host profiles with verified on-chain identities.

---

## 🛠️ Technology Stack
*   **Framework:** TanStack Start / React (Vite-powered, serverless-ready SSR)
*   **Styling:** Vanilla Tailwind CSS / Custom styles
*   **Database:** Supabase (Real-time schema, custom SQL migration tracking)
*   **Web3 Integrations:**
    *   `@circle-fin/w3s-pw-web-sdk` (Client-side PIN & OTP challenges)
    *   `@circle-fin/user-controlled-wallets` (Server-side session & transaction initializations)
    *   `viem` (EVM transaction building, gas estimations, and block explorer URL derivations)

---

## ⚙️ Environment Configuration

Add the following variables to your local `.env` file (copied from `.env.example`) or Vercel dashboard:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Circle Web3 Services API Keys
CIRCLE_API_KEY=your-circle-api-key
VITE_CIRCLE_APP_ID=your-circle-app-id
VITE_CIRCLE_CHAIN=ARC-TESTNET
CIRCLE_CHAIN=ARC-TESTNET

# Admin Security Configuration
JURIX_SESSION_SECRET=your-random-32-char-secret

# Operator Treasury Configuration (Gas + Agent Payouts)
JURIX_OPERATOR_PRIVATE_KEY=0x8fc86417fe6cb900b927c1615b0f3ce17b14e50534275811de620348e9b824aa

# AI Judge LLM Configuration
JURIX_JUDGE_PROVIDER=openai_compat
JURIX_JUDGE_BASE_URL=https://router-api.0g.ai/v1
JURIX_JUDGE_API_KEY=your-judge-api-key
JURIX_JUDGE_MODEL=glm-5.1
```

---

## 📂 Database Setup (Supabase)
Run the SQL migrations located in `supabase/migrations/` in order. 
To add the new AI Agent EVM Wallets, paste the following script into your **Supabase SQL Editor** and click **Run**:

```sql
-- 1. Add wallet address mapping column
alter table public.judge_agents
  add column if not exists wallet_address text;

-- 2. Seed default EVM wallets for the 4 Judge Agents
update public.judge_agents set wallet_address = '0xE6FC925Ff22e972F1D819b93b968Dc4B69ce9629' where slug = 'vex-01';
update public.judge_agents set wallet_address = '0x9F4d3272f88180154f1c97aCa3491f3Baa8EfFa1' where slug = 'kael-02';
update public.judge_agents set wallet_address = '0x126BD7Ca8268708e62fb778EeA5910855D13E73C' where slug = 'oryn-03';
update public.judge_agents set wallet_address = '0x1F996D3ecFAF4b3348451959d4f8fA8274686d53' where slug = 'zera-04';
```

---

## 🏃 Local Development

1. Install dependencies:
    ```bash
    npm install
    ```
2. Run the development server:
    ```bash
    npm run dev
    ```
3. Open `http://localhost:3000` in your browser.

---

## 🔍 Step-by-Step Demo Walkthrough

### 1. Log In / Sign Up
*   Click the **"Sign In"** button on the navbar.
*   Enter your email address to receive a Circle verification OTP code.
*   Enter the OTP and set up your secure 6-digit **Smart Wallet PIN**. Your Circle Smart Contract Account (SCA) is provisioned automatically on Arc!

### 2. Create a Hackathon
*   Navigate to **"Host"** (`/create`). *(You will be forced to log in if you are signed out).*
*   Fill in details: Name, Dates, criteria weighting, and custom splits (e.g. `50 / 30 / 20` for top 3 winners).
*   Click **"Host Hackathon"**. It is created in a `"Pending Funding"` state.

### 3. Fund & Activate
*   As an Admin, copy the **EVM Treasury Address** from your hackathon page.
*   Deposit the total required USDC (Prize pool + admin fees) to that address. 
*   Once verified on-chain, the status upgrades to **"Activated & Funded"**.

### 4. Submit Projects
*   As a builder, navigate to the hackathon details page and click **"Submit Project"** (`/submit`). 
*   Fill in the form. The payout address is automatically pre-filled from your profile/smart account address.

### 5. Run AI Judging
*   Navigate to the hidden Admin dashboard (`/admin`) and click **"Run Judging"** next to the hackathon.
*   The system calls the AI Judge LLMs.
*   For each score generated, JuriXAI transfers the dynamic workload-based fee on-chain from the Operator wallet to the AI agent's wallet address.
*   Once finished, a green popup toast **"Judging Completed!"** appears.

### 6. Verify Nanopayments
*   Open the submission details page. Under each judge score, you will see a verified **`✓ Fee Paid: X USDC`** link. 
*   Click it to open the transaction receipt directly on the **Arcscan** block explorer.

### 7. Disburse Winner Prizes
*   In `/admin`, notice the action button for the closed hackathon has changed to **"Disburse Prizes"**.
*   Click it. The system calculates the reward amounts based on the leaderboard rankings and splits, checks the treasury balance, sends the USDC payouts to the winners' EVM wallets on-chain, and prints verified Arcscan Tx links!

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.
