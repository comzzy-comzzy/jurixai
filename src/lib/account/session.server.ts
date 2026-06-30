import { createServerFn } from "@tanstack/react-start";
import { clearSession, useSession } from "@tanstack/react-start/server";
import { ensureAccountProfile } from "./profile.server";
import type { AccountProfile, AuthMethod } from "./types";

export type WalletSessionData = {
  identifier: string;
  authMethod: AuthMethod;
  address: string;
  chain: string;
};

type WalletSessionState = {
  wallet: WalletSessionData | null;
  profile: AccountProfile | null;
};

const SESSION_PASSWORD = process.env.JURIX_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSessionConfig() {
  if (!SESSION_PASSWORD?.trim()) {
    throw new Error(
      "Missing session secret. Set JURIX_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }

  return {
    password: SESSION_PASSWORD,
    name: "jurixai-session",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

async function hydrateProfile(wallet: WalletSessionData | null): Promise<AccountProfile | null> {
  if (!wallet) return null;

  return ensureAccountProfile({
    identifier: wallet.identifier,
    authMethod: wallet.authMethod,
    walletAddress: wallet.address,
    walletChain: wallet.chain,
  });
}

export const getWalletSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<WalletSessionData>(getSessionConfig());
  const wallet =
    session.data?.identifier &&
    session.data?.authMethod &&
    session.data?.address &&
    session.data?.chain
      ? {
          identifier: session.data.identifier,
          authMethod: session.data.authMethod,
          address: session.data.address,
          chain: session.data.chain,
        }
      : null;

  return {
    wallet,
    profile: await hydrateProfile(wallet),
  } satisfies WalletSessionState;
});

export const persistWalletSession = createServerFn({ method: "POST" })
  .validator((data: WalletSessionData) => data)
  .handler(async ({ data }) => {
    const session = await useSession<WalletSessionData>(getSessionConfig());
    await session.update({
      identifier: data.identifier,
      authMethod: data.authMethod,
      address: data.address,
      chain: data.chain,
    });

    return {
      wallet: data,
      profile: await hydrateProfile(data),
    } satisfies WalletSessionState;
  });

export const clearWalletSession = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession(getSessionConfig());
  return { ok: true };
});
