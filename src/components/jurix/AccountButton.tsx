import { useState } from "react";
import { ArrowLeft, ChevronRight, Copy, Fingerprint, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/lib/circle/useWallet";
import { isWalletConfigured, walletChain } from "@/lib/circle/wallet";
import { truncateAddr } from "@/lib/format";
import logoUrl from "@/assets/jurixai-logo.png";

type Step = "choose" | "passkey";

export function AccountButton() {
  const { wallet, busy, error, signUp, logIn, signOut } = useWallet();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [username, setUsername] = useState("");

  // ── Connected: show the wallet chip + sign out ──────────────────────────
  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(wallet.address);
            toast.success("Wallet address copied", { description: wallet.address });
          }}
          title={`${wallet.username} · ${wallet.chain}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-input transition-colors"
        >
          {truncateAddr(wallet.address)}
          <Copy className="size-3" />
        </button>
        <button
          onClick={signOut}
          title="Sign out"
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    );
  }

  const configured = isWalletConfigured();

  function reset() {
    setStep("choose");
    setUsername("");
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="rounded-lg px-4 py-2 bg-accent text-accent-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
      >
        Create account
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          {/* Brand header */}
          <div className="flex flex-col items-center text-center">
            <img src={logoUrl} alt="JuriXAI" className="size-10 object-contain mb-3" />
            <DialogTitle className="text-xl font-bold tracking-tight">
              {step === "choose" ? "Log in to JuriXAI" : "Create your wallet"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "choose"
                ? "Create a wallet to enter hackathons and get paid in USDC."
                : "Pick a username — your device secures it with a passkey."}
            </p>
          </div>

          {!configured && (
            <p className="mt-4 rounded-lg bg-warn/10 text-warn text-xs p-3">
              Wallet isn&rsquo;t configured in this environment yet (Circle keys missing).
            </p>
          )}

          {/* Step: choose method */}
          {step === "choose" && (
            <div className="mt-5 space-y-3">
              <button
                onClick={() =>
                  toast("Email sign-in is coming soon", {
                    description: "Use Passkey for now — it's instant and gasless.",
                  })
                }
                className="w-full flex items-center gap-3 rounded-xl border border-border p-3.5 text-left hover:border-input hover:bg-muted/50 transition-colors"
              >
                <span className="size-10 shrink-0 rounded-lg bg-accent/10 grid place-items-center text-accent">
                  <Mail className="size-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Email</span>
                  <span className="block text-xs text-muted-foreground">
                    One-time code to your inbox. Gasless, no seed phrase.
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              <button
                onClick={() => setStep("passkey")}
                className="w-full flex items-center gap-3 rounded-xl border border-border p-3.5 text-left hover:border-input hover:bg-muted/50 transition-colors"
              >
                <span className="size-10 shrink-0 rounded-lg bg-accent/10 grid place-items-center text-accent">
                  <Fingerprint className="size-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Passkey</span>
                  <span className="block text-xs text-muted-foreground">
                    Face ID or fingerprint on this device. Gasless.
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          )}

          {/* Step: passkey username */}
          {step === "passkey" && (
            <div className="mt-5 space-y-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username — e.g. ada.builder"
                autoFocus
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {error && <p className="text-warn text-xs">{error}</p>}
              <button
                disabled={busy || !username.trim() || !configured}
                onClick={async () => {
                  try {
                    await signUp(username.trim());
                    setOpen(false);
                    toast.success("Wallet created", {
                      description: "Your Circle smart wallet is ready.",
                    });
                  } catch {
                    /* error shown inline */
                  }
                }}
                className="w-full rounded-lg bg-accent text-accent-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {busy ? "Creating…" : "Create wallet with passkey"}
              </button>
              <button
                disabled={busy || !username.trim() || !configured}
                onClick={async () => {
                  try {
                    await logIn(username.trim());
                    setOpen(false);
                    toast.success("Signed in");
                  } catch {
                    /* error shown inline */
                  }
                }}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
              >
                I already have a wallet
              </button>
              <button
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3" /> Back
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Gasless on {walletChain()} · Secured by Circle
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
