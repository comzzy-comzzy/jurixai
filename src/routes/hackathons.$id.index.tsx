import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useWallet } from "@/lib/circle/useWallet";
import { loadHackathonDetail } from "@/lib/jurix/actions.server";
import { Countdown } from "@/components/jurix/Countdown";
import { JudgeGrid } from "@/components/jurix/JudgePanel";
import { Leaderboard } from "@/components/jurix/Leaderboard";
import { StatusPill } from "@/components/jurix/StatusPill";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { fullUsdc, relativeDate } from "@/lib/format";
import { readUsdcBalance } from "@/lib/chain";

export const Route = createFileRoute("/hackathons/$id/")({
  loader: async ({ params }) => {
    try {
      return await loadHackathonDetail({ data: { hackathon_id: params.id } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — JuriXAI` : "Hackathon — JuriXAI" },
      { name: "description", content: loaderData?.description ?? "" },
      {
        property: "og:title",
        content: loaderData ? `${loaderData.name} — JuriXAI` : "Hackathon — JuriXAI",
      },
      { property: "og:description", content: loaderData?.description ?? "" },
    ],
  }),
  component: HackathonDetail,
});

function HackathonDetail() {
  const hackathon = Route.useLoaderData();
  const [tab, setTab] = useState<"leaderboard" | "submissions">("leaderboard");
  const { wallet } = useWallet();

  const durationDays = hackathon.start_date && hackathon.deadline
    ? Math.ceil((new Date(hackathon.deadline).getTime() - new Date(hackathon.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const extraMonths = durationDays > 0 ? Math.floor(durationDays / 30) : 0;
  const adminFee = 1000 + (extraMonths * 100);
  const totalFunding = hackathon.prize_pool_usdc + adminFee;

  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!hackathon.treasury_address) return;
    let active = true;
    readUsdcBalance(hackathon.treasury_address)
      .then((bal) => active && setTreasuryBalance(bal))
      .catch(() => active && setTreasuryBalance(null));
    return () => {
      active = false;
    };
  }, [hackathon.treasury_address]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link
        to="/hackathons"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Browse
      </Link>

      <header className="mt-6 mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <StatusPill status={hackathon.status} />
            <span className="text-sm text-muted-foreground">
              by {hackathon.organizer_name ?? "Unknown organizer"}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold italic tracking-tight mb-4">
            {hackathon.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl text-pretty">
            {hackathon.description ?? "No description has been added yet."}
          </p>
        </div>
        {hackathon.status === "open" && (
          wallet ? (
            <Link
              to="/hackathons/$id/submit"
              params={{ id: hackathon.id }}
              className="shrink-0 rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              Submit project
            </Link>
          ) : (
            <button
              onClick={() => {
                toast.error("Account required", {
                  description: "Please create an account or sign in using the button in the top right to submit your project.",
                });
              }}
              className="shrink-0 rounded-lg bg-accent/40 text-accent-foreground/75 px-6 py-3 text-sm font-semibold shadow-sm hover:bg-accent/50 transition-colors cursor-pointer"
            >
              Register to submit
            </button>
          )
        )}
      </header>

      {hackathon.treasury_address && treasuryBalance !== null && treasuryBalance < totalFunding && (
        <div className="mb-8 rounded-xl border border-warn/30 bg-warn/5 p-5 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-warn flex items-center gap-2">
              <span>⚠️</span> Hackathon Pending Funding
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">
              This hackathon is pending activation until the organizer deposits the total required funds. 
              Please send exactly <span className="font-semibold text-foreground">{totalFunding.toLocaleString()} USDC</span> on **Arc Testnet** to the treasury address below to activate the hackathon.
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0 text-xs font-mono">
            <div><span className="text-muted-foreground text-xs font-normal">Received:</span> <span className="text-warn font-semibold">{treasuryBalance.toLocaleString()} USDC</span></div>
            <div><span className="text-muted-foreground text-xs font-normal">Required:</span> <span className="text-foreground font-semibold">{totalFunding.toLocaleString()} USDC</span></div>
          </div>
        </div>
      )}

      {hackathon.treasury_address && treasuryBalance !== null && treasuryBalance >= totalFunding && (
        <div className="mb-8 rounded-xl border border-accent/30 bg-accent/5 p-5 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-accent flex items-center gap-2">
              <span>✅</span> Hackathon Activated & Funded
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">
              The required funding (Prize Pool + Platform Fee) of {totalFunding.toLocaleString()} USDC has been successfully verified on-chain. 
              Submissions and payouts are fully active.
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0 text-xs font-mono text-accent">
            <span className="font-bold uppercase tracking-wider bg-accent/20 px-2 py-0.5 rounded text-[10px]">Activated</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Prize Pool & Admin Fees</p>
            <p className="text-2xl font-bold tabular-nums mb-3">
              {fullUsdc(hackathon.prize_pool_usdc)}{" "}
              <span className="text-sm font-semibold text-muted-foreground font-normal">USDC Pool</span>
            </p>
            <div className="space-y-1.5 border-t border-border/80 pt-3 text-xs text-muted-foreground font-mono">
              <div className="flex justify-between">
                <span>Prize Pool:</span>
                <span className="text-foreground">{hackathon.prize_pool_usdc.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between">
                <span>Admin Fee:</span>
                <span className="text-foreground">{adminFee.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between font-bold border-t border-dashed border-border pt-1.5 text-accent">
                <span>Total Funding:</span>
                <span>{totalFunding.toLocaleString()} USDC</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <WalletAddress address={hackathon.treasury_address ?? "Treasury pending"} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {hackathon.status === "open" ? "Deadline" : "Ended"}
          </p>
          {hackathon.status === "open" && hackathon.deadline ? (
            <Countdown to={hackathon.deadline} className="text-2xl font-bold" />
          ) : (
            <p className="text-2xl font-bold">
              {hackathon.deadline ? relativeDate(hackathon.deadline) : "TBD"}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Start: {hackathon.start_date ? relativeDate(hackathon.start_date) : "TBD"}
          </p>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Host instructions</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Submission brief</p>
            <p className="text-sm leading-relaxed text-foreground">
              {hackathon.submission_instructions ?? "No submission instructions were provided."}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Required deliverables</p>
            {hackathon.required_deliverables.length > 0 ? (
              <ul className="space-y-2 text-sm text-foreground">
                {hackathon.required_deliverables.map((item, index) => (
                  <li key={index} className="rounded-md bg-background px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No required deliverables were listed.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Judging criteria</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        {hackathon.criteria.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No criteria have been configured for this hackathon yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="p-4 font-medium">Criterion</th>
                  <th className="p-4 font-medium hidden md:table-cell">Description</th>
                  <th className="p-4 font-medium">Agent</th>
                  <th className="p-4 font-medium text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hackathon.criteria.map((criterion) => {
                  const agent = hackathon.agents.find((item) => item.id === criterion.agent_id);
                  return (
                    <tr key={criterion.id}>
                      <td className="p-4 font-semibold text-foreground">{criterion.name}</td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">
                        {criterion.description ?? "No description yet."}
                      </td>
                      <td className="p-4 font-medium text-ai">{agent?.name ?? "Unassigned"}</td>
                      <td className="p-4 text-right tabular-nums text-accent font-bold">
                        {criterion.weight_percent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">AI judge panel</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        {hackathon.agents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No judge agents are configured yet.
          </div>
        ) : (
          <JudgeGrid judges={hackathon.agents} />
        )}
      </section>

      <section>
        <div className="inline-flex gap-1 mb-6 rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setTab("leaderboard")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "leaderboard"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setTab("submissions")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "submissions"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Submissions ({hackathon.submissions.length})
          </button>
        </div>

        {tab === "leaderboard" ? (
          hackathon.submissions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
              No submissions yet.
            </div>
          ) : (
            <Leaderboard hackathonId={hackathon.id} projects={hackathon.submissions} />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hackathon.submissions.map((submission, index) => (
              <Link
                key={submission.id}
                to="/hackathons/$id/project/$projectId"
                params={{ id: hackathon.id, projectId: submission.id }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-input transition-all block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{submission.project_name}</h3>
                    <p className="text-sm text-muted-foreground">by {submission.team_name}</p>
                  </div>
                  <span className="text-2xl font-bold text-accent tabular-nums">
                    {submission.weighted_score.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {submission.description ?? "No submission description yet."}
                </p>
                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                  Rank #{index + 1}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
