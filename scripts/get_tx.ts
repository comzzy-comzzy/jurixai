import { createPublicClient, http } from "viem";
import { activeChain, ARC_RPC_URL } from "../src/lib/chain.js";

async function main() {
  const client = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  const address = "0xd5294c32b2d4b29f141afd97346820af0235191f"; // Escrow contract
  const serviceContract = "0x779ded0c9e1022225f8e0630b35a9b54be713736"; // Service contract

  console.log(`Checking X Layer (RPC: ${ARC_RPC_URL})...`);
  
  const code1 = await client.getBytecode({ address });
  const code2 = await client.getBytecode({ address: serviceContract });
  
  console.log(`Escrow bytecode exists: ${code1 ? code1.length : 0} bytes`);
  console.log(`Service bytecode exists: ${code2 ? code2.length : 0} bytes`);
}

main().catch(console.error);
