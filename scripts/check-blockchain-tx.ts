import { createPublicClient, http, parseAbiItem } from "viem";
import { activeChain, ARC_RPC_URL, USDC_ADDRESS } from "../src/lib/chain.js";

async function main() {
  const userAddress = "0xc29596c4b07a794701f57d4b1dc491ec972ebf2b";
  
  const client = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL)
  });

  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock - 5000n; // Query last 5000 blocks
  console.log(`Latest block: ${latestBlock}`);
  console.log(`Querying block range: ${fromBlock} to ${latestBlock}`);

  console.log(`Fetching USDC transfer events for ${userAddress} on-chain...`);

  // Query transfer logs where user is the sender
  const sentLogs = await client.getLogs({
    address: USDC_ADDRESS,
    event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
    args: {
      from: userAddress as `0x${string}`
    },
    fromBlock,
    toBlock: latestBlock
  });

  // Query transfer logs where user is the recipient
  const receivedLogs = await client.getLogs({
    address: USDC_ADDRESS,
    event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
    args: {
      to: userAddress as `0x${string}`
    },
    fromBlock,
    toBlock: latestBlock
  });

  console.log(`\nFound ${sentLogs.length} Sent transfers in last 5000 blocks:`);
  for (const log of sentLogs) {
    console.log(`- Tx: ${log.transactionHash}`);
    console.log(`  To: ${log.args.to}`);
    console.log(`  Amount: ${Number(log.args.value) / 1000000} USDC`);
  }

  console.log(`\nFound ${receivedLogs.length} Received transfers in last 5000 blocks:`);
  for (const log of receivedLogs) {
    console.log(`- Tx: ${log.transactionHash}`);
    console.log(`  From: ${log.args.from}`);
    console.log(`  Amount: ${Number(log.args.value) / 1000000} USDC`);
  }
}

main().catch(console.error);
