import { createPublicClient, http } from "viem";
import { activeChain, ARC_RPC_URL } from "../src/lib/chain.js";

async function main() {
  const userAddress = "0xc29596c4b07a794701f57d4b1dc491ec972ebf2b";
  
  const client = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  const nonce = await client.getTransactionCount({ address: userAddress });
  console.log(`User Address: ${userAddress}`);
  console.log(`Smart Account Nonce: ${nonce}`);
}

main().catch(console.error);
