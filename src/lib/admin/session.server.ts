/**
 * Admin auth server functions (client-callable via RPC).
 *
 * The password lives in JURIX_ADMIN_PASSWORD (server env only — never shipped to
 * the browser). Login is checked on the server and sets a signed, httpOnly
 * session cookie. The server-only guard (isAdminAuthed/requireAdmin) lives in
 * guard.server.ts so this file stays safe to import from the admin page.
 */
import { createServerFn } from "@tanstack/react-start";
import { clearSession, useSession } from "@tanstack/react-start/server";
import { adminSessionConfig, isAdminAuthed, type AdminSessionData } from "./guard.server";

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => ({
  authed: await isAdminAuthed(),
  configured: Boolean(process.env.JURIX_ADMIN_PASSWORD?.trim()),
}));

export const adminLogin = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.JURIX_ADMIN_PASSWORD?.trim();
    if (!expected) {
      throw new Error("Admin password is not configured. Set JURIX_ADMIN_PASSWORD in Vercel.");
    }
    if (data.password !== expected) {
      throw new Error("Access denied.");
    }
    const session = await useSession<AdminSessionData>(adminSessionConfig());
    await session.update({ admin: true });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession(adminSessionConfig());
  return { ok: true };
});
