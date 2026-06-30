import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import type { AccountProfile, AuthMethod, SaveAccountProfileInput } from "./types";

type EnsureAccountInput = {
  identifier: string;
  authMethod: AuthMethod;
  walletAddress: string;
  walletChain: string;
};

type AccountRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  auth_method: AuthMethod;
};

function ensureConfigured() {
  if (!hasSupabaseServerConfig()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

async function ensureAccount(input: EnsureAccountInput): Promise<AccountProfile> {
  ensureConfigured();
  const supabase = getSupabaseServerClient();
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("Supabase server client is unavailable.");
  }

  let user: AccountRow | null = null;

  if (input.authMethod === "email" && looksLikeEmail(input.identifier)) {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, display_name, auth_method")
      .eq("email", input.identifier)
      .maybeSingle();
    if (error) throw new Error(error.message);
    user = data as AccountRow | null;
  } else {
    const { data, error } = await supabase
      .from("wallets")
      .select("user_id, users!inner(id, email, display_name, auth_method)")
      .eq("smart_account", input.walletAddress)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const linked = data?.users;
    if (linked) {
      user = Array.isArray(linked) ? (linked[0] as AccountRow) : (linked as AccountRow);
    }
  }

  if (!user) {
    const { data, error } = await supabase
      .from("users")
      .insert({
        email: input.authMethod === "email" && looksLikeEmail(input.identifier) ? input.identifier : null,
        display_name: input.authMethod === "passkey" ? input.identifier : null,
        auth_method: input.authMethod,
      })
      .select("id, email, display_name, auth_method")
      .single();
    if (error) throw new Error(error.message);
    user = data as AccountRow;
  }

  const { error: walletError } = await supabase.from("wallets").upsert(
    {
      user_id: user.id,
      smart_account: input.walletAddress,
      blockchain: input.walletChain,
      is_primary: true,
    },
    { onConflict: "user_id,smart_account" },
  );
  if (walletError) throw new Error(walletError.message);

  const { data: existingProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  if (!existingProfile) {
    const { error: insertProfileError } = await supabase.from("user_profiles").insert({
      user_id: user.id,
      payout_chain: input.walletChain,
    });
    if (insertProfileError) throw new Error(insertProfileError.message);
  }

  const { data: profile, error: loadError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (loadError) throw new Error(loadError.message);

  return {
    userId: user.id,
    email: user.email,
    authMethod: user.auth_method,
    displayName: user.display_name,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    payoutEvmAddress: profile.payout_evm_address,
    payoutChain: profile.payout_chain,
    walletAddress: input.walletAddress,
    walletChain: input.walletChain,
    updatedAt: profile.updated_at,
  };
}

export async function ensureAccountProfile(input: EnsureAccountInput): Promise<AccountProfile> {
  return ensureAccount(input);
}

export const bootstrapAccountProfile = createServerFn({ method: "POST" })
  .validator((data: EnsureAccountInput) => data)
  .handler(async ({ data }) => ensureAccountProfile(data));

export const saveAccountProfile = createServerFn({ method: "POST" })
  .validator(
    (data: EnsureAccountInput & SaveAccountProfileInput) =>
      data satisfies EnsureAccountInput & SaveAccountProfileInput,
  )
  .handler(async ({ data }) => {
    const account = await ensureAccountProfile(data);
    const supabase = getSupabaseServerClient();

    const { error: userError } = await supabase
      .from("users")
      .update({
        display_name: data.displayName.trim() || null,
      })
      .eq("id", account.userId);
    if (userError) throw new Error(userError.message);

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        bio: data.bio.trim() || null,
        location: data.location.trim() || null,
        website: data.website.trim() || null,
        payout_evm_address: data.payoutEvmAddress.trim() || null,
        payout_chain: data.payoutChain.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", account.userId);
    if (profileError) throw new Error(profileError.message);

    return ensureAccountProfile(data);
  });
