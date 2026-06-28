import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createWallet, loginWallet, type CircleWallet } from "./wallet";
import { emailSignIn } from "./userWallet";

const STORAGE_KEY = "jurixai.wallet";

interface WalletContextValue {
  wallet: CircleWallet | null;
  busy: boolean;
  error: string | null;
  signUp: (username: string) => Promise<void>;
  logIn: (username: string) => Promise<void>;
  loginEmail: (email: string) => Promise<void>;
  signOut: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<CircleWallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore a previously connected wallet (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWallet(JSON.parse(raw) as CircleWallet);
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const persist = useCallback((w: CircleWallet | null) => {
    setWallet(w);
    try {
      if (w) localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore storage failures */
    }
  }, []);

  const run = useCallback(
    async (fn: () => Promise<CircleWallet>) => {
      setBusy(true);
      setError(null);
      try {
        persist(await fn());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wallet action failed");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [persist],
  );

  const signUp = useCallback((username: string) => run(() => createWallet(username)), [run]);
  const logIn = useCallback((username: string) => run(() => loginWallet(username)), [run]);
  const loginEmail = useCallback(
    (email: string) =>
      run(async () => {
        const w = await emailSignIn(email);
        return { username: w.email, address: w.address, chain: w.chain };
      }),
    [run],
  );
  const signOut = useCallback(() => persist(null), [persist]);

  return (
    <WalletContext.Provider value={{ wallet, busy, error, signUp, logIn, loginEmail, signOut }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
