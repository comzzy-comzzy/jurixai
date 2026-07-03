/**
 * Chain configuration (Arc Testnet or Polygon Amoy) and USDC helpers.
 * Automatically adapts RPC, Explorer, Chain ID, and USDC address based on VITE_CIRCLE_CHAIN.
 */
import { createPublicClient, http, erc20Abi, formatUnits, defineChain, createWalletClient, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ENV = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const CHAIN_NAME = ENV.VITE_CIRCLE_CHAIN || "ARC-TESTNET";

// Default settings for Arc Testnet
let rpcUrl = ENV.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network";
let explorerUrl = ENV.VITE_ARC_EXPLORER || "https://testnet.arcscan.app";
let chainId = Number(ENV.VITE_ARC_CHAIN_ID || "5042002");
let usdcAddress = (ENV.VITE_USDC_ADDRESS || "0x3600000000000000000000000000000000000000") as `0x${string}`;
let nativeName = "USDC";
let nativeSymbol = "USDC";

// Override with Polygon Amoy settings if selected
if (CHAIN_NAME === "MATIC-AMOY" || CHAIN_NAME === "polygonAmoy") {
  rpcUrl = "https://rpc-amoy.polygon.technology";
  explorerUrl = "https://amoy.polygonscan.com";
  chainId = 80002;
  usdcAddress = "0x41e94E0f9B5447f3963e45cf585d5D36e372559a"; // Amoy USDC
  nativeName = "POL";
  nativeSymbol = "POL";
}

export const ARC_RPC_URL = rpcUrl;
export const ARC_EXPLORER = explorerUrl;
export const ARC_CHAIN_ID = chainId;
export const USDC_ADDRESS = usdcAddress;
export const USDC_DECIMALS = 6;

export const activeChain = defineChain({
  id: ARC_CHAIN_ID,
  name: CHAIN_NAME === "MATIC-AMOY" || CHAIN_NAME === "polygonAmoy" ? "Polygon Amoy" : "Arc Testnet",
  nativeCurrency: { name: nativeName, symbol: nativeSymbol, decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
    public: { http: [ARC_RPC_URL] },
  },
  blockExplorers: { default: { name: CHAIN_NAME === "MATIC-AMOY" || CHAIN_NAME === "polygonAmoy" ? "Polygonscan" : "Arcscan", url: ARC_EXPLORER } },
  testnet: true,
});

export function explorerAddr(addr: string): string {
  return `${ARC_EXPLORER}/address/${addr}`;
}

export function explorerTx(hash: string): string {
  return `${ARC_EXPLORER}/tx/${hash}`;
}

/** Read a wallet's USDC balance on the active chain. */
export async function readUsdcBalance(address: string): Promise<number> {
  const client = createPublicClient({ chain: activeChain, transport: http(ARC_RPC_URL) });
  const raw = (await client.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  })) as bigint;
  return Number(formatUnits(raw, USDC_DECIMALS));
}

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
