/**
 * Arc Testnet — Circle's stablecoin-native L1 — plus USDC helpers.
 *
 * Values verified against Polaris/docs.arc.io. Everything is env-overridable so
 * you can point at a different RPC (e.g. your own node) without a code change:
 *   VITE_ARC_RPC_URL, VITE_ARC_EXPLORER, VITE_ARC_CHAIN_ID, VITE_USDC_ADDRESS
 */
import { createPublicClient, http, erc20Abi, formatUnits, defineChain, createWalletClient, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ENV = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const ARC_RPC_URL = ENV.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network";
export const ARC_EXPLORER = ENV.VITE_ARC_EXPLORER || "https://testnet.arcscan.app";
export const ARC_CHAIN_ID = Number(ENV.VITE_ARC_CHAIN_ID || "5042002");
export const USDC_ADDRESS = (ENV.VITE_USDC_ADDRESS ||
  "0x3600000000000000000000000000000000000000") as `0x${string}`;
export const USDC_DECIMALS = 6;

export const arcTestnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
    public: { http: [ARC_RPC_URL] },
  },
  blockExplorers: { default: { name: "Arcscan", url: ARC_EXPLORER } },
  testnet: true,
});

export function explorerAddr(addr: string): string {
  return `${ARC_EXPLORER}/address/${addr}`;
}

export function explorerTx(hash: string): string {
  return `${ARC_EXPLORER}/tx/${hash}`;
}

/**
 * Read a wallet's USDC balance on Arc, in human units (e.g. 12.5).
 * Runs against the public RPC — call from the browser.
 */
export async function readUsdcBalance(address: string): Promise<number> {
  const client = createPublicClient({ chain: arcTestnet, transport: http(ARC_RPC_URL) });
  const raw = (await client.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  })) as bigint;
  return Number(formatUnits(raw, USDC_DECIMALS));
}

/**
 * Send USDC on Arc Testnet using the server's private key.
 * Used for automated agent micro-payments.
 */
export async function sendUsdc(toAddress: string, amountUsdc: number): Promise<string> {
  // Use server env secret
  const privateKey = process.env.JURIX_OPERATOR_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing JURIX_OPERATOR_PRIVATE_KEY on the server.");
  }

  // Ensure key prefix is 0x
  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(ARC_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_RPC_URL),
  });

  const amountBigInt = parseUnits(amountUsdc.toFixed(6), USDC_DECIMALS);

  const hash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [toAddress as `0x${string}`, amountBigInt],
  });

  // Wait for block verification
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

