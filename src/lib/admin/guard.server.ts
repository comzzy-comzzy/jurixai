/**
 * Server-only admin guard. These helpers touch the request session directly, so
 * they must never be imported by client code — only called from inside server
 * function handlers (session.server.ts, actions.server.ts). Keeping them out of
 * the client-imported session.server.ts avoids pulling `@tanstack/react-start/
 * server` into the browser bundle.
 */
import { useSession } from "@tanstack/react-start/server";

export type AdminSessionData = { admin?: boolean };

const SESSION_PASSWORD = process.env.JURIX_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function adminSessionConfig() {
  if (!SESSION_PASSWORD?.trim()) {
    throw new Error("Missing session secret. Set JURIX_SESSION_SECRET on the server.");
  }
  return {
    password: SESSION_PASSWORD,
    name: "jurixai-admin",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

export async function isAdminAuthed(): Promise<boolean> {
  const session = await useSession<AdminSessionData>(adminSessionConfig());
  return session.data?.admin === true;
}

/** Throws if the caller is not an authenticated admin. Guards admin actions. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthed())) {
    throw new Error("Admin authentication required.");
  }
}
