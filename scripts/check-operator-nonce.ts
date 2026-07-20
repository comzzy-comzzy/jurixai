import { createPublicClient, http } from "viem";
import { activeChain, ARC_RPC_URL } from "../src/lib/chain.js";
import { getOperatorAddress } from "../src/lib/chain.server.js";

async function main() {
  const operatorAddress = getOperatorAddress();
  
  const client = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  // Get current transaction count (mined nonce)
  const minedNonce = await client.getTransactionCount({
    address: operatorAddress,
    blockTag: "latest"
  });

  // Get pending transaction count (mempool nonce)
  const pendingNonce = await client.getTransactionCount({
    address: operatorAddress,
    blockTag: "pending"
  });

  console.log(`Operator Address: ${operatorAddress}`);
  console.log(`Mined Nonce:      ${minedNonce}`);
  console.log(`Pending Nonce:    ${pendingNonce}`);

  if (pendingNonce > minedNonce) {
    console.log(`\n⚠️ WARNING: There are ${pendingNonce - minedNonce} transaction(s) pending in the mempool for the operator! This is causing a transaction queue block!`);
  } else {
    console.log(`\n✅ Operator mempool is clear (no stuck transactions).`);
  }
}

main().catch(console.error);
