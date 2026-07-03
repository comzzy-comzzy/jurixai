import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment } from "react";
import { toast } from "sonner";
import {
  loadHackathons,
  loadHomeData,
  setHackathonTreasury,
  testJudgeModel,
  triggerHackathonJudging,
} from "@/lib/jurix/actions.server";
import { StatusPill } from "@/components/jurix/StatusPill";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { readUsdcBalance } from "@/lib/chain";
import type { HackathonSummary } from "@/lib/jurix/types";
import { fullUsdc, relativeDate } from "@/lib/format";
import { adminLogin, adminLogout, adminStatus } from "@/lib/admin/session.server";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const [hackathons, home, admin] = await Promise.all([
      loadHackathons(),
      loadHomeData(),
      adminStatus(),
    ]);
    return { hackathons, home, admin };
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
  const { hackathons, home, admin } = Route.useLoaderData();
  const [authed, setAuthed] = useState(admin.authed);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            setLoggingIn(true);
            try {
              await adminLogin({ data: { password: pwd } });
              setAuthed(true);
              setPwd("");
            } catch (error) {
              setErr(error instanceof Error ? error.message : "Access denied");
            } finally {
              setLoggingIn(false);
            }
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
            autoComplete="current-password"
            className="w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {err && <p className="text-warn text-sm font-medium">{err}</p>}
          <button
            disabled={loggingIn || !pwd}
            className="w-full rounded-lg bg-accent text-accent-foreground px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loggingIn ? "Checking…" : "Authenticate"}
          </button>
          {!admin.configured && (
            <p className="text-xs text-warn text-center pt-2">
              Admin password not set — add JURIX_ADMIN_PASSWORD in Vercel.
            </p>
          )}
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
        <JudgeModelTester />
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
              {hackathons.map((hackathon) => {
                const isExpanded = expandedId === hackathon.id;
                const durationDays = hackathon.start_date && hackathon.deadline
                  ? Math.ceil((new Date(hackathon.deadline).getTime() - new Date(hackathon.start_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const extraMonths = durationDays > 0 ? Math.floor(durationDays / 30) : 0;
                const adminFee = 1000 + (extraMonths * 100);
                const totalFunding = hackathon.prize_pool_usdc + adminFee;

                return (
                  <Fragment key={hackathon.id}>
                    <tr className="hover:bg-muted/40 transition-colors">
                      <td 
                        className="p-3 font-semibold text-foreground select-none cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : hackathon.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[10px] w-3">{isExpanded ? "▼" : "▶"}</span>
                          {hackathon.name}
                        </div>
                      </td>
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
                        <div className="flex justify-end gap-2">
                          <Link
                            to="/hackathons/$id"
                            params={{ id: hackathon.id }}
                            className="rounded-md border border-border px-3 py-1 font-semibold hover:bg-muted transition-colors"
                          >
                            View entries
                          </Link>
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
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/5">
                        <td colSpan={7} className="p-6 border-t border-b border-border/80">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Organizer & Setup Details</h4>
                              <div className="grid grid-cols-2 gap-y-3">
                                <div>
                                  <p className="text-muted-foreground text-xs">Organizer Name</p>
                                  <p className="font-medium text-foreground">{hackathon.organizer_name || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Organizer Email</p>
                                  <p className="font-medium text-foreground">{hackathon.organizer_email || "N/A"}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-muted-foreground text-xs">Duration & Dates</p>
                                  <p className="font-medium text-foreground">
                                    {hackathon.start_date ? new Date(hackathon.start_date).toLocaleDateString() : "N/A"} to{" "}
                                    {hackathon.deadline ? new Date(hackathon.deadline).toLocaleDateString() : "N/A"}{" "}
                                    <span className="text-muted-foreground text-xs font-normal">({durationDays} days)</span>
                                  </p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-muted-foreground text-xs mb-1">Rewards Distribution (Winner Split)</p>
                                  <div className="flex gap-2">
                                    {hackathon.winner_split && hackathon.winner_split.length > 0 ? (
                                      hackathon.winner_split.map((percent, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded bg-muted text-xs font-semibold">
                                          {i + 1}st: {percent}%
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground text-xs">None configured</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Financial Audit & Fees</h4>
                              <div className="grid grid-cols-2 gap-y-2 border-b border-border pb-3 text-xs">
                                <span className="text-muted-foreground">Prize Pool:</span>
                                <span className="font-semibold text-right">{hackathon.prize_pool_usdc.toLocaleString()} USDC</span>
                                
                                <span className="text-muted-foreground">Flat Admin Fee:</span>
                                <span className="font-semibold text-right">1,000 USDC</span>

                                <span className="text-muted-foreground">Duration Extra Fee ({durationDays} days):</span>
                                <span className="font-semibold text-right">{(extraMonths * 100).toLocaleString()} USDC</span>

                                <span className="text-foreground font-semibold text-sm">Total Required Funding:</span>
                                <span className="font-bold text-accent text-right text-sm">{totalFunding.toLocaleString()} USDC</span>
                              </div>

                              <TreasuryVerificationCell hackathon={hackathon} totalFunding={totalFunding} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-right">
        <button
          onClick={async () => {
            try {
              await adminLogout();
            } catch {
              /* ignore */
            }
            setAuthed(false);
          }}
          className="text-sm font-medium text-muted-foreground hover:text-warn"
        >
          Log out →
        </button>
      </div>
    </div>
  );
}

/**
 * One-click check of the real judge model (0G/GLM). Pings the configured model
 * once and shows the raw HTTP status + response, so a broken config is obvious
 * instead of silently falling back to placeholder scores.
 */
function JudgeModelTester() {
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult(null);
          try {
            setResult(await testJudgeModel());
          } catch (e) {
            setResult({ error: e instanceof Error ? e.message : String(e) });
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
      >
        {busy ? "Testing model…" : "Test judge model"}
      </button>
      {result && (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-4 text-xs">
          {result.configured === false ? (
            <p className="text-warn font-medium">
              Not configured — JURIX_JUDGE_API_KEY / JURIX_JUDGE_MODEL are missing.
            </p>
          ) : (
            <div className="space-y-1 font-mono">
              <p>
                <span className="text-muted-foreground">endpoint:</span> {result.endpoint}
              </p>
              <p>
                <span className="text-muted-foreground">model:</span> {result.model}
              </p>
              <p>
                <span className="text-muted-foreground">status:</span>{" "}
                <span className={result.ok ? "text-accent" : "text-warn"}>
                  {result.status ?? "—"} {result.ok ? "OK" : "FAILED"}
                </span>
              </p>
              {result.error && (
                <p className="text-warn">
                  <span className="text-muted-foreground">error:</span> {result.error}
                </p>
              )}
              {result.body && (
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-3 text-[11px] leading-relaxed">
                  {result.body}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
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

function TreasuryVerificationCell({ hackathon, totalFunding }: { hackathon: HackathonSummary; totalFunding: number }) {
  const [balance, setBalance] = useState<number | null>(null);
  const address = hackathon.treasury_address;

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    readUsdcBalance(address)
      .then((b) => !cancelled && setBalance(b))
      .catch(() => !cancelled && setBalance(null));
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) {
    return (
      <div className="rounded-lg bg-warn/15 text-warn border border-warn/20 p-3.5 text-xs flex flex-col gap-1">
        <span className="font-bold">No Treasury Address Set</span>
        <span>Set a treasury address above to verify payment.</span>
      </div>
    );
  }

  const isFunded = balance !== null && balance >= totalFunding;

  return (
    <div className={`rounded-lg p-3.5 border ${isFunded ? "bg-accent/10 border-accent/30 text-foreground" : "bg-warn/10 border-warn/30 text-foreground"} text-xs flex flex-col gap-1.5`}>
      <div className="flex justify-between items-center">
        <span className="font-bold text-[13px]">Live Payment Verification</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isFunded ? "bg-accent text-accent-foreground" : "bg-warn text-warn-foreground"}`}>
          {balance === null ? "CHECKING" : isFunded ? "PAYMENT VERIFIED" : "PENDING PAYMENT"}
        </span>
      </div>
      <div className="space-y-1 font-mono text-[11px] mt-1">
        <p><span className="text-muted-foreground">EVM Wallet:</span> {address}</p>
        <p>
          <span className="text-muted-foreground">USDC Balance:</span>{" "}
          <span className={isFunded ? "text-accent font-bold" : "text-warn font-bold"}>
            {balance === null ? "..." : `${balance.toLocaleString()} USDC`}
          </span>
        </p>
        <p><span className="text-muted-foreground">Required:</span> {totalFunding.toLocaleString()} USDC</p>
      </div>
    </div>
  );
}

