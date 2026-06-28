import { useState } from "react";
import { Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWallet } from "@/lib/circle/useWallet";
import { isWalletConfigured, walletChain } from "@/lib/circle/wallet";
import { truncateAddr } from "@/lib/format";

export function AccountButton() {
  const { wallet, busy, error, signUp, logIn, signOut } = useWallet();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");

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
  const disabled = busy || !username.trim() || !configured;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg px-4 py-2 bg-accent text-accent-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
      >
        Create account
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>Create your JuriXAI wallet</DialogTitle>
            <DialogDescription>
              We&rsquo;ll create a Circle smart wallet secured by a passkey (Face ID, fingerprint,
              or device PIN). No seed phrase — your prize money lands here.
            </DialogDescription>
          </DialogHeader>

          {!configured && (
            <p className="rounded-lg bg-warn/10 text-warn text-xs p-3">
              Wallet isn&rsquo;t configured in this environment yet (Circle keys missing).
            </p>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ada.builder"
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            {error && <p className="text-warn text-xs">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                disabled={disabled}
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
                className="flex-1 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {busy ? "Creating…" : "Create wallet"}
              </button>
              <button
                disabled={disabled}
                onClick={async () => {
                  try {
                    await logIn(username.trim());
                    setOpen(false);
                    toast.success("Signed in");
                  } catch {
                    /* error shown inline */
                  }
                }}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
              >
                I have one
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Wallets are created on {walletChain()} (testnet). Gas is sponsored by Circle.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
