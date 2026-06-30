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

const CHAIN = process.env.CIRCLE_CHAIN || "MATIC-AMOY";

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
  .validator((d: { userToken: string }) => d)
  .handler(async ({ data }) => {
    const c = client();
    const existing = await c.listWallets({ userToken: data.userToken });
    const wallets = existing.data?.wallets ?? [];
    if (wallets.length > 0) {
      return { challengeId: null as string | null, address: wallets[0].address ?? null };
    }
    const created = await c.createWallet({
      userToken: data.userToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blockchains: [CHAIN as any],
      accountType: "SCA",
    });
    return { challengeId: created.data?.challengeId ?? null, address: null as string | null };
  });

/** Read back the user's first wallet address. */
export const listUserWallets = createServerFn({ method: "POST" })
  .validator((d: { userToken: string }) => d)
  .handler(async ({ data }) => {
    const res = await client().listWallets({ userToken: data.userToken });
    const w = res.data?.wallets?.[0];
    return { address: w?.address ?? null, blockchain: w?.blockchain ?? null };
  });
