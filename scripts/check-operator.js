import { createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activeChain, ARC_RPC_URL } from "../src/lib/chain.js";

async function main() {
  const privateKey = process.env.JURIX_OPERATOR_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Missing JURIX_OPERATOR_PRIVATE_KEY");
    process.exit(1);
  }
  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);
  
  const client = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  const balance = await client.getBalance({ address: account.address });
  console.log(`Operator Address: ${account.address}`);
  console.log(`Native Balance: ${formatEther(balance)} ETH`);
}

main().catch(console.error);
