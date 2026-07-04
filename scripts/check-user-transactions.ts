import { getSupabaseServerClient } from "../src/lib/supabase/server.js";
import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";

async function main() {
  const supabase = getSupabaseServerClient();
  
  // Find user's wallet
  const userAddress = "0xc29596c4b07a794701f57d4b1dc491ec972ebf2b";
  const { data: walletRow, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("smart_account", userAddress)
    .maybeSingle();

  if (error || !walletRow) {
    console.error("Wallet not found in database:", error);
    return;
  }

  console.log("Found Wallet in Supabase:");
  console.log(JSON.stringify(walletRow, null, 2));

  // Now query Circle using developer client
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.error("Missing CIRCLE_API_KEY");
    return;
  }

  const c = initiateUserControlledWalletsClient({ apiKey });

  // List transactions for the user
  console.log(`\nQuerying transactions from Circle for wallet address ${userAddress}...`);
  
  // Circle Developer SDK supports listing transactions. We can retrieve transactions
  // and filter by the smart contract destination or user wallet address.
  const res = await c.listTransactions({
    blockchain: "MATIC-AMOY", // It will return MATIC-AMOY or all if we don't specify, let's list latest
    pageSize: 10
  });

  const txs = res.data?.transactions ?? [];
  console.log(`Fetched ${txs.length} recent transactions:`);
  
  // Let's filter transactions where sourceAddress or destinationAddress matches
  const userTxs = txs.filter((t: any) => 
    String(t.sourceAddress).toLowerCase() === userAddress.toLowerCase() ||
    String(t.destinationAddress).toLowerCase() === userAddress.toLowerCase()
  );

  console.log(JSON.stringify(userTxs, null, 2));
}

main().catch(console.error);
