import { createPublicClient, http } from "viem";
import { activeChain, ARC_RPC_URL } from "../src/lib/chain.js";
import details from "./contract-details.json";

async function main() {
  const client = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  const operator = await client.readContract({
    address: details.address as `0x${string}`,
    abi: details.abi,
    functionName: "operator",
  });

  console.log(`On-chain operator: ${operator}`);
}

main().catch(console.error);
