/**
 * Circle User-Controlled Wallets — SERVER functions.
 *
 * These run only on the server (TanStack server functions) and use the secret
 * CIRCLE_API_KEY to talk to Circle. The key is never sent to the browser.
 *
 * Flow: the browser gets a deviceId, we mint an email-login device token
 * (Circle emails the OTP), the browser SDK collects the code and returns a
 * userToken, then we create / list the user's wallet with that userToken.
 */
import { createServerFn } from "@tanstack/react-start";
import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";
import { USDC_ADDRESS, CHAIN_NAME } from "@/lib/chain";

const CHAIN = process.env.CIRCLE_CHAIN || "ARC-TESTNET";

function client() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error("CIRCLE_API_KEY is not set on the server (add it in Vercel).");
  }
  return initiateUserControlledWalletsClient({ apiKey });
}

/** Report whether the server has the minimum config required for email login. */
export const emailLoginStatus = createServerFn({ method: "GET" }).handler(async () => ({
  configured: Boolean(process.env.CIRCLE_API_KEY?.trim()),
  apiKeyConfigured: Boolean(process.env.CIRCLE_API_KEY?.trim()),
  chain: CHAIN,
}));

/** Mint a device token for email login — triggers Circle to email the OTP code. */
export const emailLoginStart = createServerFn({ method: "POST" })
  .validator((d: { email: string; deviceId: string }) => d)
  .handler(async ({ data }) => {
    const res = await client().createDeviceTokenForEmailLogin({
      deviceId: data.deviceId,
      email: data.email,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = res.data as any;
    return {
      deviceToken: d.deviceToken as string,
      deviceEncryptionKey: d.deviceEncryptionKey as string,
      otpToken: d.otpToken as string | undefined,
    };
  });

/** Ensure the logged-in user has a wallet; create one if not. */
export const provisionWallet = createServerFn({ method: "POST" })
  .validator((d: { userToken: string; email: string }) => d)
  .handler(async ({ data }) => {
    // 1. Fast path: check if user and their wallet already exist in our Supabase DB
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (url && serviceKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();
        
      if (user) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("smart_account")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .maybeSingle();
          
        if (wallet?.smart_account) {
          return { challengeId: null as string | null, address: wallet.smart_account };
        }
      }
    }

    // 2. Slow path: fallback to Circle API
    const c = client();
    const existing = await c.listWallets({ userToken: data.userToken });
    const wallets = existing.data?.wallets ?? [];
    if (wallets.length > 0) {
      return { challengeId: null as string | null, address: wallets[0].address ?? null };
    }
    // First-time user: no PIN and no wallet yet. createUserPinWithWallets sets a
    // PIN and creates the wallet(s) in one challenge (createWallet alone assumes a
    // PIN already exists, which is why the old flow hung on first login).
    const created = await c.createUserPinWithWallets({
      userToken: data.userToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blockchains: [CHAIN as any],
      accountType: "SCA",
    });
    return { challengeId: created.data?.challengeId ?? null, address: null as string | null };
  });

/** Read back the user's first wallet address and ID. */
export const listUserWallets = createServerFn({ method: "POST" })
  .validator((d: { userToken: string }) => d)
  .handler(async ({ data }) => {
    const res = await client().listWallets({ userToken: data.userToken });
    const w = res.data?.wallets?.[0];
    return { id: w?.id ?? null, address: w?.address ?? null, blockchain: w?.blockchain ?? null };
  });

/** Create a transfer challenge for withdrawing USDC from a user's wallet. */
export const createWithdrawalTransaction = createServerFn({ method: "POST" })
  .validator(
    (d: {
      userToken: string;
      walletId: string;
      recipientAddress: string;
      amount: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const c = client();
    // 1. Fetch user's token balances to find the dynamic USDC tokenId registered by Circle
    let tokenId = "";
    try {
      const balancesRes = await c.getWalletTokenBalance({
        walletId: data.walletId,
        userToken: data.userToken,
      });
      const tokenBalances = balancesRes.data?.tokenBalances ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usdcToken = tokenBalances.find((tb: any) => tb.token?.symbol?.toUpperCase() === "USDC");
      if (usdcToken?.token?.id) {
        tokenId = usdcToken.token.id;
      }
    } catch (e) {
      console.warn("[createWithdrawalTransaction] failed to fetch balances, using fallback address:", e);
    }

    const txParams: any = {
      userToken: data.userToken,
      idempotencyKey: crypto.randomUUID(),
      walletId: data.walletId,
      amounts: [String(data.amount)],
      destinationAddress: data.recipientAddress,
      fee: {
        type: "level",
        config: {
          feeLevel: "LOW",
        },
      },
    };

    if (tokenId) {
      txParams.tokenId = tokenId;
    } else {
      // Fallback: pass tokenAddress and blockchain
      const blockchainParam = (CHAIN_NAME === "polygonAmoy" ? "MATIC-AMOY" : CHAIN_NAME) as any;
      txParams.tokenAddress = USDC_ADDRESS;
      txParams.blockchain = blockchainParam;
    }

    const res = await c.createTransaction(txParams);
    return { challengeId: res.data?.challengeId ?? null };
  });
