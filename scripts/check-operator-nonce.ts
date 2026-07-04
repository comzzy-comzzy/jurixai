import { createPublicClient, http } from "viem";
import { activeChain, ARC_RPC_URL } from "../src/lib/chain.js";

async function main() {
  const operatorAddress = "0x5A305347b6BC3469505886d87D41C5EFC1A5E979";
  
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
