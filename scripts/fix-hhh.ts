import { createWalletClient, createPublicClient, http, erc20Abi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activeChain, ARC_RPC_URL, USDC_ADDRESS, USDC_DECIMALS } from "../src/lib/chain.js";
import { ESCROW_CONTRACT_ADDRESS, escrowAbi } from "../src/lib/chain.js";

async function main() {
  const privateKey = process.env.JURIX_OPERATOR_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Missing JURIX_OPERATOR_PRIVATE_KEY");
    process.exit(1);
  }
  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);

  const walletClient = createWalletClient({
    account,
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  console.log("1. Transferring 30 USDC from operator address to Escrow Contract...");
  const amountBigInt = parseUnits("30.0", USDC_DECIMALS);
  const tx1 = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [ESCROW_CONTRACT_ADDRESS as `0x${string}`, amountBigInt]
  });
  console.log(`USDC Transfer hash: ${tx1}`);
  console.log("Waiting for confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: tx1 });
  console.log("Transfer confirmed!\n");

  console.log("2. Registering hackathon 'hhh' on the Escrow Smart Contract...");
  const prizePoolBigInt = parseUnits("20.0", USDC_DECIMALS);
  const platformFeeBigInt = parseUnits("10.0", USDC_DECIMALS);
  const hoster = "0xc29596c4b07a794701f57d4b1dc491ec972ebf2b";

  const tx2 = await walletClient.writeContract({
    address: ESCROW_CONTRACT_ADDRESS as `0x${string}`,
    abi: escrowAbi,
    functionName: "registerHackathon",
    args: ["hhh", hoster as `0x${string}`, prizePoolBigInt, platformFeeBigInt]
  });
  console.log(`Escrow Registration hash: ${tx2}`);
  console.log("Waiting for confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log("\n🎉 Hackathon 'hhh' successfully registered on-chain in JuriXEscrow!");
}

main().catch(console.error);
