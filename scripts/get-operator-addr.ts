import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env
dotenv.config();

const privateKey = process.env.JURIX_OPERATOR_PRIVATE_KEY;
if (!privateKey) {
  console.error("No JURIX_OPERATOR_PRIVATE_KEY found in .env");
  process.exit(1);
}

const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
const account = privateKeyToAccount(formattedKey as `0x${string}`);

console.log("\n==============================================");
console.log(`Operator Public EVM Address: ${account.address}`);
console.log("==============================================\n");
