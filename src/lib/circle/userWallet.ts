/**
 * Circle User-Controlled Wallets — BROWSER flow (email OTP + passkey-free).
 *
 * Uses @circle-fin/w3s-pw-web-sdk (dynamically imported so it stays out of the
 * SSR bundle). The SDK renders Circle's own OTP entry UI when verifyOtp() is
 * called, so we only collect the email here.
 */
import { emailLoginStart, provisionWallet, listUserWallets } from "./userWallet.server";
import type { CircleWallet } from "./wallet";

const APP_ID = import.meta.env.VITE_CIRCLE_APP_ID as string | undefined;
const CHAIN = (import.meta.env.VITE_CIRCLE_CHAIN as string | undefined) || "MATIC-AMOY";

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
 * Start email login: sends the OTP, opens Circle's code-entry UI, and resolves
 * with a session once the user enters the right code.
 */
async function loginWithEmail(email: string): Promise<Session> {
  if (!APP_ID) throw new Error("Circle App ID is missing (VITE_CIRCLE_APP_ID).");
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");

  return new Promise<Session>((resolve, reject) => {
    const sdk = new W3SSdk(
      { appSettings: { appId: APP_ID } },
      // onLoginComplete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any, result: any) => {
        if (error) {
          reject(new Error(error?.message || "Email login failed."));
          return;
        }
        const userToken = result?.userToken ?? result?.data?.userToken;
        const encryptionKey = result?.encryptionKey ?? result?.data?.encryptionKey;
        if (!userToken || !encryptionKey) {
          reject(new Error("Login did not return a session."));
          return;
        }
        resolve({ userToken, encryptionKey });
      },
    );

    (async () => {
      try {
        const deviceId = await sdk.getDeviceId();
        const tok = await emailLoginStart({ data: { email, deviceId } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sdk as any).updateConfigs({
          appSettings: { appId: APP_ID },
          loginConfigs: {
            deviceToken: tok.deviceToken,
            deviceEncryptionKey: tok.deviceEncryptionKey,
            otpToken: tok.otpToken,
          },
        });
        sdk.verifyOtp();
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Failed to start email login."));
      }
    })();
  });
}

/** Create the wallet if needed (running the SDK challenge), then return the address. */
async function ensureWallet(session: Session): Promise<string> {
  const prov = await provisionWallet({ data: { userToken: session.userToken } });

  if (prov.challengeId) {
    const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
    await new Promise<void>((resolve, reject) => {
      const sdk = new W3SSdk({ appSettings: { appId: APP_ID! } });
      sdk.setAuthentication({
        userToken: session.userToken,
        encryptionKey: session.encryptionKey,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sdk.execute(prov.challengeId as string, (error: any) => {
        if (error) reject(new Error(error?.message || "Wallet creation failed."));
        else resolve();
      });
    });
  }

  const list = await listUserWallets({ data: { userToken: session.userToken } });
  const address = list.address ?? prov.address ?? "";
  if (!address) {
    throw new Error("Circle login succeeded but no wallet address was returned.");
  }
  return address;
}

/** Full email sign-in: OTP → wallet. Returns the user's wallet. */
export async function emailSignIn(email: string): Promise<CircleWallet> {
  const session = await loginWithEmail(email);
  const address = await ensureWallet(session);
  return { identifier: email, address, chain: CHAIN, authMethod: "email" };
}
