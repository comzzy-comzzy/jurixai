/**
 * Server-only chain actions using the administrator's operator private key.
 * Strictly executed on the server to prevent private key leakage.
 */
import { createPublicClient, http, erc20Abi, createWalletClient, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activeChain, ARC_RPC_URL, USDC_ADDRESS, USDC_DECIMALS } from "./chain";

/** Send USDC on the active chain using the operator's private key. */
export async function sendUsdc(toAddress: string, amountUsdc: number): Promise<string> {
  const privateKey = process.env.JURIX_OPERATOR_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing JURIX_OPERATOR_PRIVATE_KEY on the server.");
  }

  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: activeChain,
    transport: http(ARC_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL),
  });

  const amountBigInt = parseUnits(amountUsdc.toFixed(6), USDC_DECIMALS);

  const hash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [toAddress as `0x${string}`, amountBigInt],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
