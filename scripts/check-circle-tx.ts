import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.error("Missing CIRCLE_API_KEY");
    process.exit(1);
  }
  
  const c = initiateUserControlledWalletsClient({ apiKey });

  const walletId = "9f25752c-293e-56e6-99cf-df212ef389e7"; // Let's list transactions first
  
  console.log("Fetching transactions from Circle...");
  const res = await c.listTransactions({
    pageSize: 10
  });

  console.log("Recent Transactions:");
  console.log(JSON.stringify(res.data?.transactions, null, 2));
}

main().catch(console.error);
