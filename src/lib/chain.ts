/**
 * Chain configuration (Arc Testnet or Polygon Amoy) and USDC helpers.
 * Automatically adapts RPC, Explorer, Chain ID, and USDC address based on VITE_CIRCLE_CHAIN.
 */
import { createPublicClient, http, erc20Abi, formatUnits, defineChain } from "viem";

const ENV = (typeof process !== "undefined" ? process.env : null) ?? (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export let CHAIN_NAME = ENV.VITE_CIRCLE_CHAIN || "ARC-TESTNET";

// Browser override logic to switch chain dynamically
if (typeof window !== "undefined") {
  const urlParams = new URLSearchParams(window.location.search);
  const chainParam = urlParams.get("chain");
  if (chainParam) {
    localStorage.setItem("jurixai_active_chain", chainParam);
  }
  const storedChain = localStorage.getItem("jurixai_active_chain");
  if (storedChain) {
    CHAIN_NAME = storedChain;
  }
}

// Default settings for Arc Testnet
let rpcUrl = ENV.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network";
let explorerUrl = ENV.VITE_ARC_EXPLORER || "https://testnet.arcscan.app";
let chainId = Number(ENV.VITE_ARC_CHAIN_ID || "5042002");
let usdcAddress = (ENV.VITE_USDC_ADDRESS || "0x3600000000000000000000000000000000000000") as `0x${string}`;
let nativeName = "USDC";
let nativeSymbol = "USDC";
let isTestnet = true;

// Override with Polygon Amoy settings if selected
if (CHAIN_NAME === "MATIC-AMOY" || CHAIN_NAME === "polygonAmoy") {
  rpcUrl = "https://rpc-amoy.polygon.technology";
  explorerUrl = "https://amoy.polygonscan.com";
  chainId = 80002;
  usdcAddress = "0x41e94E0f9B5447f3963e45cf585d5D36e372559a"; // Amoy USDC
  nativeName = "POL";
  nativeSymbol = "POL";
} else if (CHAIN_NAME === "XLAYER-MAINNET" || CHAIN_NAME === "xlayerMainnet") {
  rpcUrl = ENV.VITE_XLAYER_RPC_URL || "https://rpc.xlayer.tech";
  explorerUrl = ENV.VITE_XLAYER_EXPLORER || "https://www.okx.com/web3/explorer/xlayer";
  chainId = 196;
  usdcAddress = (ENV.VITE_XLAYER_USDT_ADDRESS || "0x1e4a5963ab45c92842273a04572e87e1a9bfd975") as `0x${string}`; // USDT on X Layer Mainnet
  nativeName = "OKB";
  nativeSymbol = "OKB";
  isTestnet = false;
} else if (CHAIN_NAME === "MONAD-MAINNET" || CHAIN_NAME === "monadMainnet") {
  rpcUrl = ENV.VITE_MONAD_RPC_URL || "https://rpc.monad.xyz";
  explorerUrl = ENV.VITE_MONAD_EXPLORER || "https://monadscan.com";
  chainId = 143;
  usdcAddress = (ENV.VITE_MONAD_USDC_ADDRESS || "0x754704Bc059F8C67012fEd69BC8A327a5aafb603") as `0x${string}`; // Canonical USDC on Monad Mainnet
  nativeName = "MON";
  nativeSymbol = "MON";
  isTestnet = false;
} else if (CHAIN_NAME === "MONAD-TESTNET" || CHAIN_NAME === "monadTestnet") {
  rpcUrl = ENV.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
  explorerUrl = ENV.VITE_MONAD_EXPLORER || "https://testnet.monadscan.com";
  chainId = 10143;
  usdcAddress = (ENV.VITE_MONAD_USDC_ADDRESS || "0x534b2f3A21130d7a60830c2Df862319e593943A3") as `0x${string}`; // Testnet USDC
  nativeName = "MON";
  nativeSymbol = "MON";
  isTestnet = true;
}

export const ARC_RPC_URL = rpcUrl;
export const ARC_EXPLORER = explorerUrl;
export const ARC_CHAIN_ID = chainId;
export const USDC_ADDRESS = usdcAddress;
export const USDC_DECIMALS = 6;

export const activeChain = defineChain({
  id: ARC_CHAIN_ID,
  name:
    CHAIN_NAME === "MATIC-AMOY" || CHAIN_NAME === "polygonAmoy"
      ? "Polygon Amoy"
      : CHAIN_NAME === "XLAYER-MAINNET" || CHAIN_NAME === "xlayerMainnet"
      ? "X Layer Mainnet"
      : CHAIN_NAME === "MONAD-MAINNET" || CHAIN_NAME === "monadMainnet"
      ? "Monad Mainnet"
      : CHAIN_NAME === "MONAD-TESTNET" || CHAIN_NAME === "monadTestnet"
      ? "Monad Testnet"
      : "Arc Testnet",
  nativeCurrency: { name: nativeName, symbol: nativeSymbol, decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
    public: { http: [ARC_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name:
        CHAIN_NAME === "MATIC-AMOY" || CHAIN_NAME === "polygonAmoy"
          ? "Polygonscan"
          : CHAIN_NAME === "XLAYER-MAINNET" || CHAIN_NAME === "xlayerMainnet"
          ? "OKX Explorer"
          : CHAIN_NAME === "MONAD-MAINNET" || CHAIN_NAME === "monadMainnet"
          ? "Monadscan"
          : CHAIN_NAME === "MONAD-TESTNET" || CHAIN_NAME === "monadTestnet"
          ? "Monadscan (Testnet)"
          : "Arcscan",
      url: ARC_EXPLORER,
    },
  },
  testnet: isTestnet,
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

export const ESCROW_CONTRACT_ADDRESS = ENV.VITE_ESCROW_CONTRACT_ADDRESS || (
  CHAIN_NAME === "XLAYER-MAINNET" || CHAIN_NAME === "xlayerMainnet"
    ? "0xd5294c32b2d4b29f141afd97346820af0235191f"
  : CHAIN_NAME === "MONAD-MAINNET" || CHAIN_NAME === "monadMainnet"
    ? "0xd5294c32b2d4b29f141afd97346820af0235191f"
  : CHAIN_NAME === "MONAD-TESTNET" || CHAIN_NAME === "monadTestnet"
    ? "0x0000000000000000000000000000000000000000" // To be updated upon deployment
  : "0x89db74b925f694ebec1118cff9b08a1afe528785"
);

export const escrowAbi = [
  {
    inputs: [
      { internalType: "string", name: "hackathonId", type: "string" }
    ],
    name: "cancelAndRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "hackathonId", type: "string" },
      { internalType: "address[]", name: "winners", type: "address[]" },
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" }
    ],
    name: "disbursePrizes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "", type: "string" }],
    name: "hackathons",
    outputs: [
      { internalType: "address", name: "hoster", type: "address" },
      { internalType: "uint256", name: "prizePool", type: "uint256" },
      { internalType: "uint256", name: "platformFee", type: "uint256" },
      { internalType: "bool", name: "disbursed", type: "bool" },
      { internalType: "bool", name: "exists", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "hackathonId", type: "string" },
      { internalType: "address", name: "hoster", type: "address" },
      { internalType: "uint256", name: "prizePool", type: "uint256" },
      { internalType: "uint256", name: "platformFee", type: "uint256" }
    ],
    name: "registerHackathon",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;


