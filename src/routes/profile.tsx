import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/lib/circle/useWallet";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile Dashboard — JuriXAI" }],
  }),
  component: ProfileRoute,
});

function ProfileRoute() {
  const { wallet, profile, profileBusy, saveProfile } = useWallet();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [payoutEvmAddress, setPayoutEvmAddress] = useState("");
  const [payoutChain, setPayoutChain] = useState("");

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    setBio(profile?.bio ?? "");
    setLocation(profile?.location ?? "");
    setWebsite(profile?.website ?? "");
    setPayoutEvmAddress(profile?.payoutEvmAddress ?? wallet?.address ?? "");
    setPayoutChain(profile?.payoutChain ?? wallet?.chain ?? "");
  }, [profile, wallet]);

  if (!wallet) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h1 className="text-3xl font-bold tracking-tight">Create your account first</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Your profile dashboard appears after email or passkey registration creates your Circle
            wallet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Back home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-border bg-card p-8">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">
            Profile dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Your JuriXAI account</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Update your public profile, keep your payout destination current, and use the same
            registered wallet for ARC USDC prize receipts.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await saveProfile({
                  displayName,
                  bio,
                  location,
                  website,
                  payoutEvmAddress,
                  payoutChain,
                });
                toast.success("Profile saved");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to save profile.");
              }
            }}
          >
            <Field label="Display name">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name or team name"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent"
              />
            </Field>

            <Field label="Bio">
              <Textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell builders and judges who you are."
                className="min-h-32 rounded-xl"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Location">
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Berlin, Lagos, Remote"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent"
                />
              </Field>
              <Field label="Website">
                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent"
                />
              </Field>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Withdrawal wallet">
                <input
                  value={payoutEvmAddress}
                  onChange={(event) => setPayoutEvmAddress(event.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-accent"
                />
              </Field>
              <Field label="Destination chain">
                <input
                  value={payoutChain}
                  onChange={(event) => setPayoutChain(event.target.value)}
                  placeholder="ARB-SEPOLIA, BASE, OP"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent"
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={profileBusy}
              className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {profileBusy ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">
              Registration wallet
            </p>
            <p className="mt-3 break-all font-mono text-sm text-foreground">{wallet.address}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This is the wallet created during signup. ARC USDC prizes should land here first.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">
              Account identity
            </p>
            <p className="mt-3 text-sm text-foreground">{wallet.identifier}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Auth method: {wallet.authMethod} · Network: {wallet.chain}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
