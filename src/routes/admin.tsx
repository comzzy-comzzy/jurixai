import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  loadHackathons,
  loadHomeData,
  setHackathonTreasury,
  triggerHackathonJudging,
} from "@/lib/jurix/actions.server";
import { StatusPill } from "@/components/jurix/StatusPill";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { readUsdcBalance } from "@/lib/chain";
import type { HackathonSummary } from "@/lib/jurix/types";
import { fullUsdc, relativeDate } from "@/lib/format";

const ADMIN_PASSWORD = "jurixai2026";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const [hackathons, home] = await Promise.all([loadHackathons(), loadHomeData()]);
    return { hackathons, home };
  },
  head: () => ({
    meta: [
      { title: "Admin — JuriXAI" },
      { name: "description", content: "JuriXAI operator console." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { hackathons, home } = Route.useLoaderData();
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalPool = useMemo(
    () => hackathons.reduce((sum, hackathon) => sum + hackathon.prize_pool_usdc, 0),
    [hackathons],
  );

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-3">Restricted</p>
        <h1 className="text-2xl font-bold italic tracking-tight mb-6">Operator console</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pwd === ADMIN_PASSWORD) setAuthed(true);
            else setErr("Access denied");
          }}
          className="space-y-4"
        >
          <input
            type="password"
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value);
              setErr("");
            }}
            placeholder="Admin password"
            className="w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {err && <p className="text-warn text-sm font-medium">{err}</p>}
          <button className="w-full rounded-lg bg-accent text-accent-foreground px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
            Authenticate
          </button>
          <p className="text-xs text-muted-foreground text-center pt-2">Hint: jurixai2026</p>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-10 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2">
          Operator console
        </p>
        <h1 className="text-3xl md:text-4xl font-bold italic tracking-tight">Admin dashboard</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { l: "Hackathons", v: String(hackathons.length) },
          { l: "Submissions", v: String(home.stats.total_submissions) },
          { l: "Pool total", v: `${fullUsdc(totalPool)} USDC` },
          { l: "Agents online", v: String(home.active_agents.length) },
        ].map((item) => (
          <div key={item.l} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground mb-2">{item.l}</p>
            <p className="text-xl font-bold tabular-nums">{item.v}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-foreground mb-3">Hackathon registry</h2>
      {actionMessage && <p className="text-sm text-accent mb-3">{actionMessage}</p>}
      {hackathons.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
          No hackathons have been created in Supabase yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Pool</th>
                <th className="p-3 font-medium">Subs</th>
                <th className="p-3 font-medium">Deadline</th>
                <th className="p-3 font-medium">Treasury (Arc)</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hackathons.map((hackathon) => (
                <tr key={hackathon.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground">{hackathon.name}</td>
                  <td className="p-3">
                    <StatusPill status={hackathon.status} />
                  </td>
                  <td className="p-3 tabular-nums font-medium text-accent">
                    {fullUsdc(hackathon.prize_pool_usdc)}
                  </td>
                  <td className="p-3 tabular-nums">{hackathon.submission_count}</td>
                  <td className="p-3 text-muted-foreground">
                    {hackathon.deadline ? relativeDate(hackathon.deadline) : "TBD"}
                  </td>
                  <td className="p-3">
                    <TreasuryCell hackathon={hackathon} />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === hackathon.id}
                      onClick={async () => {
                        setBusyId(hackathon.id);
                        setActionMessage(null);
                        try {
                          const result = await triggerHackathonJudging({
                            data: { hackathon_id: hackathon.id, triggered_by: "admin" },
                          });
                          setActionMessage(
                            `Judging started for ${hackathon.name}. Run ${result.runId} wrote ${result.scored} score rows.`,
                          );
                        } catch (error) {
                          setActionMessage(
                            error instanceof Error ? error.message : "Failed to trigger judging.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-md border border-border px-3 py-1 font-semibold hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {busyId === hackathon.id ? "Running…" : "Run judging"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-right">
        <button
          onClick={() => setAuthed(false)}
          className="text-sm font-medium text-muted-foreground hover:text-warn"
        >
          Log out →
        </button>
      </div>
    </div>
  );
}

/**
 * Treasury wallet for a hackathon: the on-chain address that receives entry
 * fees / prize-pool funding, plus its live USDC balance on Arc. Paste an address
 * to set it; any USDC sent to it shows up in the balance on refresh.
 */
function TreasuryCell({ hackathon }: { hackathon: HackathonSummary }) {
  const [saved, setSaved] = useState<string>(hackathon.treasury_address ?? "");
  const [draft, setDraft] = useState<string>(hackathon.treasury_address ?? "");
  const [editing, setEditing] = useState<boolean>(!hackathon.treasury_address);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!saved) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    readUsdcBalance(saved)
      .then((b) => !cancelled && setBalance(b))
      .catch(() => !cancelled && setBalance(null));
    return () => {
      cancelled = true;
    };
  }, [saved]);

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="0x treasury address"
          className="w-52 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await setHackathonTreasury({
                  data: { hackathon_id: hackathon.id, treasury_address: draft },
                });
                setSaved(res.treasury_address);
                setEditing(false);
                toast.success("Treasury wallet set", { description: res.treasury_address });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to set treasury.");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {saved && (
            <button
              type="button"
              onClick={() => {
                setDraft(saved);
                setEditing(false);
              }}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <WalletAddress address={saved} />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tabular-nums text-accent">
          {balance === null
            ? "balance —"
            : `${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
