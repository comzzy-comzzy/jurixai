/**
 * Circle configuration — SERVER ONLY.
 *
 * This module reads secrets from environment variables and must never be
 * imported into client/browser code. The CIRCLE_API_KEY controls money and is
 * only ever sent from the server to Circle's API over HTTPS.
 *
 * Locally these come from `.env` (gitignored). In production set them in the
 * Vercel dashboard (Project → Settings → Environment Variables).
 */

export interface CircleConfig {
  apiKey: string;
  clientKey: string;
  kitKey: string;
  env: "sandbox" | "production";
  apiBase: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. Set it in .env (local) or the Vercel dashboard (production).`,
    );
  }
  return v.trim();
}

/**
 * Loads and validates Circle config from the environment. Throws if a required
 * secret is missing so failures are loud and early rather than silent at
 * payment time.
 */
export function getCircleConfig(): CircleConfig {
  const env = (process.env.CIRCLE_ENV ?? "sandbox") as "sandbox" | "production";
  const apiBase =
    process.env.CIRCLE_API_BASE?.trim() ||
    (env === "production" ? "https://api.circle.com" : "https://api-sandbox.circle.com");

  return {
    apiKey: required("CIRCLE_API_KEY"),
    clientKey: required("CIRCLE_CLIENT_KEY"),
    kitKey: required("CIRCLE_KIT_KEY"),
    env,
    apiBase,
  };
}

/** True when Circle secrets are present — useful for graceful UI fallbacks. */
export function isCircleConfigured(): boolean {
  return Boolean(process.env.CIRCLE_API_KEY && process.env.CIRCLE_CLIENT_KEY);
}
