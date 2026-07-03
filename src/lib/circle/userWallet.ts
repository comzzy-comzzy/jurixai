/**
 * Circle User-Controlled Wallets — BROWSER flow (email OTP + PIN) on Arc.
 *
 * Uses @circle-fin/w3s-pw-web-sdk (dynamically imported so it stays out of the
 * SSR bundle). IMPORTANT: a single SDK instance is reused across the OTP login
 * and the PIN-setup challenge. Creating a second instance for the challenge (as
 * the old code did) leaves Circle's PIN screen unrendered, so the flow hangs on
 * "creating" forever. This mirrors Circle's own reference apps (e.g. Polaris).
 */
import { emailLoginStart, provisionWallet, listUserWallets } from "./userWallet.server";
import type { CircleWallet } from "./wallet";

const APP_ID = import.meta.env.VITE_CIRCLE_APP_ID as string | undefined;
const CHAIN = (import.meta.env.VITE_CIRCLE_CHAIN as string | undefined) || "ARC-TESTNET";

export function isEmailLoginConfigured(): boolean {
  return Boolean(APP_ID);
}

export function userWalletChain(): string {
  return CHAIN;
}

interface Session {
  userToken: string;
  encryptionKey: string;
}

/**
 * Circle's SDK deps (jsonwebtoken/uuid) expect Node globals in the browser. The
 * client build aliases the `buffer`/`process` modules, but some transitive code
 * reads the bare `Buffer`/`process`/`global` globals — populate them before the
 * SDK loads. No-op on the server.
 */
async function ensureBrowserGlobals(): Promise<void> {
  if (typeof window === "undefined") return;
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g.global) g.global = globalThis;
  if (!g.Buffer) {
    const { Buffer } = await import("buffer");
    g.Buffer = Buffer;
  }
  if (!g.process) {
    const proc = (await import("process/browser" as any)) as { default?: unknown };
    g.process = proc.default ?? proc;
  }
}

// The SDK's types are loose; keep a local alias to avoid `any` sprawl.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W3S = any;

/** Run a Circle challenge (PIN setup / signing) on an existing SDK instance. */
function runChallenge(sdk: W3S, challengeId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    sdk.execute(challengeId, (error: { message?: string } | undefined) => {
      if (error) reject(new Error(error.message || "PIN setup failed."));
      else resolve();
    });
  });
}

/** Poll for the wallet address (it materializes shortly after the PIN ceremony). */
async function waitForWalletAddress(userToken: string, tries = 30): Promise<string> {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await listUserWallets({ data: { userToken } });
      if (list && list.address) return list.address;
    } catch (e) {
      console.warn("[waitForWalletAddress] polling error (retrying):", e);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return "";
}

/**
 * Full email sign-in: OTP → (first time) set a PIN + create the Arc wallet →
 * return the wallet. A single SDK instance handles both the OTP and the PIN
 * challenge.
 */
export async function emailSignIn(email: string): Promise<CircleWallet> {
  if (!APP_ID) throw new Error("Circle App ID is missing (VITE_CIRCLE_APP_ID).");
  await ensureBrowserGlobals();
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");

  // 1) Authenticate with the email OTP. onLoginComplete yields the session.
  let resolveLogin!: (s: Session) => void;
  let rejectLogin!: (e: Error) => void;
  const loginDone = new Promise<Session>((res, rej) => {
    resolveLogin = res;
    rejectLogin = rej;
  });

  const sdk: W3S = new W3SSdk(
    { appSettings: { appId: APP_ID } },
    // onLoginComplete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error: any, result: any) => {
      if (error) return rejectLogin(new Error(error?.message || "Email login failed."));
      const userToken = result?.userToken ?? result?.data?.userToken;
      const encryptionKey = result?.encryptionKey ?? result?.data?.encryptionKey;
      if (!userToken || !encryptionKey) {
        return rejectLogin(new Error("Login did not return a session."));
      }
      resolveLogin({ userToken, encryptionKey });
    },
  );

  const deviceId = await sdk.getDeviceId();
  const tok = await emailLoginStart({ data: { email, deviceId } });
  sdk.updateConfigs({
    appSettings: { appId: APP_ID },
    loginConfigs: {
      deviceToken: tok.deviceToken,
      deviceEncryptionKey: tok.deviceEncryptionKey,
      otpToken: tok.otpToken,
    },
  });
  sdk.verifyOtp();

  const session = await loginDone;

  // 2) Get the wallet. First-time users have none → run the "set PIN + create
  //    wallet" ceremony on the SAME sdk instance, then poll for the address.
  const prov = await provisionWallet({ data: { userToken: session.userToken, email } });
  let address = prov.address ?? "";
  if (!address && prov.challengeId) {
    sdk.setAuthentication({
      userToken: session.userToken,
      encryptionKey: session.encryptionKey,
    });
    await runChallenge(sdk, prov.challengeId);
    address = await waitForWalletAddress(session.userToken);
  }

  if (!address) {
    throw new Error("Wallet not ready yet — please try signing in again.");
  }
  return { identifier: email, address, chain: CHAIN, authMethod: "email" };
}

/**
 * Execute a USDC transfer out of the user's smart wallet to a destination EVM address.
 * Initiates an email OTP session for authorization, generates the challenge, and prompts the user's PIN.
 */
export async function executeWithdrawal(
  email: string,
  recipientAddress: string,
  amount: number,
): Promise<void> {
  if (!APP_ID) throw new Error("Circle App ID is missing (VITE_CIRCLE_APP_ID).");
  await ensureBrowserGlobals();
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
  const { createWithdrawalTransaction } = await import("./userWallet.server");

  // 1) Authenticate with the email OTP. onLoginComplete yields the session.
  let resolveLogin!: (s: Session) => void;
  let rejectLogin!: (e: Error) => void;
  const loginDone = new Promise<Session>((res, rej) => {
    resolveLogin = res;
    rejectLogin = rej;
  });

  const sdk: W3S = new W3SSdk(
    { appSettings: { appId: APP_ID } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error: any, result: any) => {
      if (error) return rejectLogin(new Error(error?.message || "Email verification failed."));
      const userToken = result?.userToken ?? result?.data?.userToken;
      const encryptionKey = result?.encryptionKey ?? result?.data?.encryptionKey;
      if (!userToken || !encryptionKey) {
        return rejectLogin(new Error("Verification did not return a session."));
      }
      resolveLogin({ userToken, encryptionKey });
    },
  );

  const deviceId = await sdk.getDeviceId();
  const tok = await emailLoginStart({ data: { email, deviceId } });
  sdk.updateConfigs({
    appSettings: { appId: APP_ID },
    loginConfigs: {
      deviceToken: tok.deviceToken,
      deviceEncryptionKey: tok.deviceEncryptionKey,
      otpToken: tok.otpToken,
    },
  });
  sdk.verifyOtp();

  const session = await loginDone;

  // 2) Get the wallet ID
  const list = await listUserWallets({ data: { userToken: session.userToken } });
  if (!list.id) {
    throw new Error("Could not locate your wallet ID.");
  }

  // 3) Create the withdrawal transaction (yields a challengeId)
  const tx = await createWithdrawalTransaction({
    data: {
      userToken: session.userToken,
      walletId: list.id,
      recipientAddress,
      amount,
    },
  });

  if (!tx.challengeId) {
    throw new Error("Failed to generate withdrawal challenge.");
  }

  // 4) Execute the challenge (PIN verification prompt) using a fresh SDK instance to avoid state pollution
  const sdkChallenge = new W3SSdk({ appSettings: { appId: APP_ID } });
  sdkChallenge.setAuthentication({
    userToken: session.userToken,
    encryptionKey: session.encryptionKey,
  });
  await runChallenge(sdkChallenge, tx.challengeId);
}
