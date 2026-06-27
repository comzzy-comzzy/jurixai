import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getHackathon, getHackathonProjects, judges, type Hackathon } from "@/lib/mock-data";
import { StatusPill } from "@/components/jurix/StatusPill";
import { Countdown } from "@/components/jurix/Countdown";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { JudgeGrid } from "@/components/jurix/JudgePanel";
import { Leaderboard } from "@/components/jurix/Leaderboard";
import { fullUsdc, relativeDate } from "@/lib/format";

export const Route = createFileRoute("/hackathons/$id")({
  loader: ({ params }): { hackathon: Hackathon } => {
    const h = getHackathon(params.id);
    if (!h) throw notFound();
    return { hackathon: h };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.hackathon.name} — JuriXAI` : "Hackathon — JuriXAI" },
      { name: "description", content: loaderData?.hackathon.description ?? "" },
      {
        property: "og:title",
        content: loaderData ? `${loaderData.hackathon.name} — JuriXAI` : "Hackathon — JuriXAI",
      },
      { property: "og:description", content: loaderData?.hackathon.description ?? "" },
    ],
  }),
  component: HackathonDetail,
});

function HackathonDetail() {
  const { hackathon } = Route.useLoaderData();
  const projects = getHackathonProjects(hackathon.id);
  const [tab, setTab] = useState<"leaderboard" | "submissions">("leaderboard");

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
            <span className="text-sm text-muted-foreground">by {hackathon.organizerName}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{hackathon.name}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl text-pretty">
            {hackathon.description}
          </p>
        </div>
        {hackathon.status === "open" && (
          <Link
            to="/hackathons/$id/submit"
            params={{ id: hackathon.id }}
            className="shrink-0 rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            Submit project
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">Prize pool</p>
          <p className="text-2xl font-bold tabular-nums">
            {fullUsdc(hackathon.prizePoolUsdc)}{" "}
            <span className="text-sm font-semibold text-muted-foreground">USDC</span>
          </p>
          <div className="mt-3">
            <WalletAddress address={hackathon.circleWalletAddress} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {hackathon.status === "open" ? "Deadline" : "Ended"}
          </p>
          {hackathon.status === "open" ? (
            <Countdown to={hackathon.deadline} className="text-2xl font-bold" />
          ) : (
            <p className="text-2xl font-bold">{relativeDate(hackathon.deadline)}</p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Start: {relativeDate(hackathon.startDate)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">Winner split</p>
          <div className="flex gap-5">
            {hackathon.winnerSplit.map((s: number, i: number) => (
              <div key={i}>
                <p className="text-2xl font-bold tabular-nums text-accent">{s}%</p>
                <p className="text-xs text-muted-foreground">#{i + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Judging criteria</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="p-4 font-medium">Criterion</th>
                <th className="p-4 font-medium hidden md:table-cell">Description</th>
                <th className="p-4 font-medium">Judge</th>
                <th className="p-4 font-medium text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hackathon.criteria.map((c: (typeof hackathon.criteria)[number]) => (
                <tr key={c.id}>
                  <td className="p-4 font-semibold text-foreground">{c.name}</td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                    {c.description}
                  </td>
                  <td className="p-4 font-medium text-ai">{c.assignedJudge}</td>
                  <td className="p-4 text-right tabular-nums text-accent font-bold">{c.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">AI judge panel</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <JudgeGrid judges={judges} />
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
            Submissions ({projects.length})
          </button>
        </div>

        {tab === "leaderboard" ? (
          projects.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
              No submissions yet.
            </div>
          ) : (
            <Leaderboard hackathonId={hackathon.id} projects={projects} />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p, i) => (
              <Link
                key={p.id}
                to="/hackathons/$id/project/$projectId"
                params={{ id: hackathon.id, projectId: p.id }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-input transition-all block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">by {p.teamName}</p>
                  </div>
                  <span className="text-2xl font-bold text-accent tabular-nums">
                    {(p.compositeScore / 10).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border pt-3">
                  <span>Rank #{i + 1}</span>
                  <span>{p.communityVotes} votes</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
