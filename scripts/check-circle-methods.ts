import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY || "dummy";
  const c = initiateUserControlledWalletsClient({ apiKey });
  
  console.log("Client properties & methods:");
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(c))
    .filter(name => typeof (c as any)[name] === "function");
  
  console.log(JSON.stringify(methods, null, 2));
}

main().catch(console.error);
