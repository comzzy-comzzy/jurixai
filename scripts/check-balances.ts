import { createPublicClient, http, erc20Abi } from "viem";
import { activeChain, ARC_RPC_URL, USDC_ADDRESS, readUsdcBalance } from "../src/lib/chain.js";
import { ESCROW_CONTRACT_ADDRESS } from "../src/lib/chain.js";
import { getOperatorAddress } from "../src/lib/chain.server.js";

async function main() {
  const userAddress = "0xc29596c4b07a794701f57d4b1dc491ec972ebf2b";
  const operatorAddress = getOperatorAddress();

  console.log("Checking live USDC balances on Arc Testnet:\n");

  const userBalance = await readUsdcBalance(userAddress);
  const escrowBalance = await readUsdcBalance(ESCROW_CONTRACT_ADDRESS);
  const operatorBalance = await readUsdcBalance(operatorAddress);

  console.log(`User Address:     ${userAddress}`);
  console.log(`User Balance:     ${userBalance} USDC\n`);

  console.log(`Escrow Address:   ${ESCROW_CONTRACT_ADDRESS}`);
  console.log(`Escrow Balance:   ${escrowBalance} USDC\n`);

  console.log(`Operator Address: ${operatorAddress}`);
  console.log(`Operator Balance: ${operatorBalance} USDC\n`);
}

main().catch(console.error);
