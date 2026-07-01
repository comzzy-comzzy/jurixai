import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpRight, Copy, RefreshCw, Wallet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/lib/circle/useWallet";
import { readUsdcBalance, explorerAddr } from "@/lib/chain";
import { truncateAddr } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Dashboard — JuriXAI" }] }),
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
    setPayoutChain(profile?.payoutChain ?? "ARC-TESTNET");
  }, [profile, wallet]);

  if (!wallet) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Wallet className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your account first</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Your dashboard, profile, and Arc wallet appear here once you sign in with email.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            Back home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold italic tracking-tight">Your account</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
          {wallet.identifier} · Arc Testnet
        </div>
      </header>

      {/* Balance — the hero card */}
      <BalanceCard address={wallet.address} />

      {/* Two columns: profile form + side settings */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Public profile */}
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight">Public profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How builders and judges see you across JuriXAI.
          </p>

          <form
            className="mt-6 space-y-5"
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
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or team name"
                className={inputClass}
              />
            </Field>

            <Field label="Bio">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell builders and judges who you are."
                className="min-h-28 rounded-xl"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Location">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Berlin, Lagos, Remote"
                  className={inputClass}
                />
              </Field>
              <Field label="Website">
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={profileBusy}
              className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {profileBusy ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>

        {/* Side: wallet + payout */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">
              Registration wallet
            </p>
            <p className="mt-3 break-all font-mono text-sm text-foreground">{wallet.address}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(wallet.address);
                  toast.success("Wallet address copied");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-input hover:text-foreground transition-colors"
              >
                <Copy className="size-3.5" /> Copy
              </button>
              <a
                href={explorerAddr(wallet.address)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-input hover:text-foreground transition-colors"
              >
                <ArrowUpRight className="size-3.5" /> Explorer
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              This is the gasless Circle wallet created at signup. Arc USDC prizes land here.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">
              Payout destination
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Where you want to withdraw winnings (any EVM address).
            </p>
            <div className="mt-4 space-y-4">
              <Field label="Withdrawal address">
                <input
                  value={payoutEvmAddress}
                  onChange={(e) => setPayoutEvmAddress(e.target.value)}
                  placeholder="0x..."
                  className={`${inputClass} font-mono`}
                />
              </Field>
              <Field label="Destination chain">
                <input
                  value={payoutChain}
                  onChange={(e) => setPayoutChain(e.target.value)}
                  placeholder="ARC-TESTNET, BASE, ARB-SEPOLIA"
                  className={inputClass}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Saved with your profile above. Withdrawals go live soon.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

/** Prominent Arc USDC balance card with deposit + (soon) withdraw. */
function BalanceCard({ address }: { address: string }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setBalance(await readUsdcBalance(address));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-accent/5 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">
              Wallet balance · Arc
            </p>
            <button
              type="button"
              onClick={() => void load()}
              title="Refresh balance"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums">
              {loading ? "—" : failed ? "—" : (balance ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="mb-1 text-sm font-semibold text-muted-foreground">USDC</span>
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {truncateAddr(address)}
            {failed ? " · balance unavailable — retry" : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(address);
              toast.success("Wallet address copied", {
                description: "Send Arc USDC here — it'll show in your balance.",
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ArrowDownToLine className="size-4" /> Deposit
          </button>
          <button
            type="button"
            onClick={() => toast("Withdrawals are coming soon", {
              description: "You'll be able to send USDC to any EVM wallet from here.",
            })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            <ArrowUpRight className="size-4" /> Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
