import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

export function hasSupabaseServerConfig(): boolean {
  return Boolean(
    process.env.VITE_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached;

  const url = required("VITE_SUPABASE_URL");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (!client || typeof client.from !== "function") {
    throw new Error("Supabase server client failed to initialize correctly.");
  }

  cached = client;

  return cached;
}
