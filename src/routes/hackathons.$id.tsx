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
  loader: ({ params }) => {
    const h = getHackathon(params.id);
    if (!h) throw notFound();
    return { hackathon: h };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.hackathon.name} — JuriXAI` : "Hackathon — JuriXAI" },
      { name: "description", content: loaderData?.hackathon.description ?? "" },
      { property: "og:title", content: loaderData ? `${loaderData.hackathon.name} — JuriXAI` : "Hackathon — JuriXAI" },
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
      <Link to="/hackathons" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-accent">
        ← BROWSE
      </Link>

      <header className="mt-6 mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border-dim pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <StatusPill status={hackathon.status} />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              BY {hackathon.organizerName}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4">{hackathon.name}</h1>
          <p className="text-muted-foreground max-w-2xl text-pretty">{hackathon.description}</p>
        </div>
        {hackathon.status === "open" && (
          <Link
            to="/hackathons/$id/submit"
            params={{ id: hackathon.id }}
            className="shrink-0 bg-accent text-accent-foreground px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest"
          >
            SUBMIT_PROJECT
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border-dim border border-border-dim mb-12">
        <div className="bg-background p-5">
          <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest">PRIZE_POOL</p>
          <p className="text-2xl font-bold tabular-nums">{fullUsdc(hackathon.prizePoolUsdc)} <span className="text-sm text-muted-foreground">USDC</span></p>
          <div className="mt-3"><WalletAddress address={hackathon.circleWalletAddress} /></div>
        </div>
        <div className="bg-background p-5">
          <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest">
            {hackathon.status === "open" ? "DEADLINE" : "ENDED"}
          </p>
          {hackathon.status === "open" ? (
            <Countdown to={hackathon.deadline} className="text-2xl font-bold" />
          ) : (
            <p className="text-2xl font-bold font-mono">{relativeDate(hackathon.deadline)}</p>
          )}
          <p className="text-[10px] font-mono text-muted-foreground mt-3 uppercase">START: {relativeDate(hackathon.startDate)}</p>
        </div>
        <div className="bg-background p-5">
          <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest">WINNER_SPLIT</p>
          <div className="flex gap-4">
            {hackathon.winnerSplit.map((s: number, i: number) => (
              <div key={i}>
                <p className="text-2xl font-bold tabular-nums text-accent">{s}%</p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase">#{i + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-mono tracking-widest text-muted-foreground uppercase">JUDGING_CRITERIA</h2>
          <div className="h-px flex-1 bg-border-dim" />
        </div>
        <div className="border border-border-dim">
          <table className="w-full font-mono text-xs">
            <thead className="border-b border-border-dim">
              <tr className="text-left text-muted-foreground">
                <th className="p-4 font-normal">CRITERION</th>
                <th className="p-4 font-normal hidden md:table-cell">DESCRIPTION</th>
                <th className="p-4 font-normal">JUDGE</th>
                <th className="p-4 font-normal text-right">WEIGHT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim">
              {hackathon.criteria.map((c: typeof hackathon.criteria[number]) => (
                <tr key={c.id}>
                  <td className="p-4 font-bold text-foreground">{c.name}</td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{c.description}</td>
                  <td className="p-4 text-ai">{c.assignedJudge.toUpperCase()}</td>
                  <td className="p-4 text-right tabular-nums text-accent font-bold">{c.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-mono tracking-widest text-muted-foreground uppercase">AI_JUDGE_PANEL</h2>
          <div className="h-px flex-1 bg-border-dim" />
        </div>
        <JudgeGrid judges={judges} />
      </section>

      <section>
        <div className="flex gap-px bg-border-dim mb-6 w-fit border border-border-dim">
          <button
            onClick={() => setTab("leaderboard")}
            className={`px-4 py-2 text-[11px] font-mono uppercase tracking-widest ${
              tab === "leaderboard" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            LEADERBOARD
          </button>
          <button
            onClick={() => setTab("submissions")}
            className={`px-4 py-2 text-[11px] font-mono uppercase tracking-widest ${
              tab === "submissions" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            SUBMISSIONS ({projects.length})
          </button>
        </div>

        {tab === "leaderboard" ? (
          projects.length === 0 ? (
            <div className="border border-border-dim p-12 text-center font-mono text-muted-foreground text-sm">
              NO_SUBMISSIONS_YET
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
                className="border border-border-dim p-5 hover:border-accent transition-colors block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">BY {p.teamName}</p>
                  </div>
                  <span className="text-2xl font-bold text-accent tabular-nums">{(p.compositeScore / 10).toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground border-t border-border-dim pt-3">
                  <span>RANK #{String(i + 1).padStart(2, "0")}</span>
                  <span>{p.communityVotes} VOTES</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
