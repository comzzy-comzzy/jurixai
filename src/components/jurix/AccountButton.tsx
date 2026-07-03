import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Copy, Fingerprint, LogOut, Mail } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/lib/circle/useWallet";
import { emailLoginStatus } from "@/lib/circle/userWallet.server";
import { isEmailLoginConfigured, userWalletChain } from "@/lib/circle/userWallet";
import { isWalletConfigured, walletChain } from "@/lib/circle/wallet";
import { truncateAddr } from "@/lib/format";
import logoUrl from "@/assets/jurixai-logo.png";

type Step = "choose" | "email" | "passkey";

export function AccountButton() {
  const { wallet, busy, error, loginEmail, signOut, signUp, logIn } = useWallet();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        const status = await emailLoginStatus();
        if (cancelled) return;
        setServerReady(status.configured);
        setServerError(
          status.configured
            ? null
            : "Circle email login is not fully configured on the server. Add CIRCLE_API_KEY in Vercel.",
        );
      } catch (err) {
        if (cancelled) return;
        setServerReady(false);
        setServerError(err instanceof Error ? err.message : "Failed to verify Circle login setup.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // ── Connected: wallet chip + sign out ───────────────────────────────────
  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/profile"
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-input hover:text-foreground"
        >
          Dashboard
        </Link>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(wallet.address);
            toast.success("Wallet address copied", { description: wallet.address });
          }}
          title={`${wallet.identifier} · ${wallet.chain}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-input transition-colors"
        >
          {truncateAddr(wallet.address)}
          <Copy className="size-3" />
        </button>
        <button
          onClick={() => {
            signOut();
            router.invalidate();
            router.navigate({ to: "/" });
          }}
          title="Sign out"
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    );
  }

  const configured = isEmailLoginConfigured() && serverReady !== false;
  const setupMessage = !isEmailLoginConfigured()
    ? "Wallet login is not configured in this environment yet (VITE_CIRCLE_APP_ID missing)."
    : serverError;
  const passkeySetupMessage = !isWalletConfigured()
    ? "Passkey wallet setup is missing VITE_CIRCLE_CLIENT_KEY and VITE_CIRCLE_CLIENT_URL."
    : null;
  const title =
    step === "choose"
      ? "Log in to JuriXAI"
      : step === "email"
        ? "Continue with email"
        : "Continue with passkey";
  const subtitle =
    step === "choose"
      ? "Create your account, get a personal wallet, and unlock your profile dashboard."
      : step === "email"
        ? "We'll email you a one-time code, create your wallet, and open your profile dashboard."
        : "Use a passkey on this device to create your wallet and account.";

  function reset() {
    setStep("choose");
    setEmail("");
    setHandle("");
    setServerError(null);
    setServerReady(null);
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
        <DialogContent className="max-w-sm rounded-2xl p-6" onCloseAutoFocus={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center text-center">
            <img src={logoUrl} alt="JuriXAI" className="size-10 object-contain mb-3" />
            <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>

          {step === "email" && setupMessage && (
            <p className="mt-4 rounded-lg bg-warn/10 text-warn text-xs p-3">{setupMessage}</p>
          )}
          {step === "passkey" && passkeySetupMessage && (
            <p className="mt-4 rounded-lg bg-warn/10 text-warn text-xs p-3">{passkeySetupMessage}</p>
          )}

          {/* Step: choose method */}
          {step === "choose" && (
            <div className="mt-5 space-y-3">
              <button
                onClick={() => setStep("email")}
                className="w-full flex items-center gap-3 rounded-xl border border-border p-3.5 text-left hover:border-input hover:bg-muted/50 transition-colors"
              >
                <span className="size-10 shrink-0 rounded-lg bg-accent/10 grid place-items-center text-accent">
                  <Mail className="size-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Email</span>
                  <span className="block text-xs text-muted-foreground">
                    One-time code to your inbox. Profile + wallet created on first login.
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
                    Face ID or fingerprint on this device. Separate Circle passkey setup required.
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          )}

          {/* Step: email */}
          {step === "email" && (
            <div className="mt-5 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoFocus
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {error && <p className="text-warn text-xs">{error}</p>}
              <button
                disabled={busy || !email.trim() || !configured || serverReady === null}
                onClick={async () => {
                  setOpen(false);
                  const tid = toast.loading("Requesting code from Circle...");
                  try {
                    await loginEmail(email.trim());
                    toast.success("Wallet ready", {
                      id: tid,
                      description: "Your Circle wallet is connected.",
                    });
                    router.invalidate();
                    router.navigate({ to: "/profile" });
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Email login failed";
                    toast.error("Login failed", {
                      id: tid,
                      description: msg,
                    });
                  }
                }}
                className="w-full rounded-lg bg-accent text-accent-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {busy
                  ? "Sending code…"
                  : serverReady === null
                    ? "Checking setup…"
                    : "Email me a code"}
              </button>
              <button
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3" /> Back
              </button>
            </div>
          )}

          {step === "passkey" && (
            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="choose-a-handle"
                autoFocus
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {error && <p className="text-warn text-xs">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={busy || !handle.trim() || !isWalletConfigured()}
                  onClick={async () => {
                    try {
                      await signUp(handle.trim());
                      setOpen(false);
                      toast.success("Passkey wallet created");
                      router.invalidate();
                      router.navigate({ to: "/profile" });
                    } catch {
                      /* error shown inline */
                    }
                  }}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {busy ? "Working…" : "Create"}
                </button>
                <button
                  disabled={busy || !handle.trim() || !isWalletConfigured()}
                  onClick={async () => {
                    try {
                      await logIn(handle.trim());
                      setOpen(false);
                      toast.success("Passkey wallet connected");
                      router.invalidate();
                      router.navigate({ to: "/profile" });
                    } catch {
                      /* error shown inline */
                    }
                  }}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {busy ? "Working…" : "Sign in"}
                </button>
              </div>
              <button
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3" /> Back
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {step === "passkey" ? `Passkey on ${walletChain()}` : `Gasless on ${userWalletChain()}`} ·
            {" "}Secured by Circle
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
