import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getHackathon, getProject, type Hackathon, type Project } from "@/lib/mock-data";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { ScoreBar } from "@/components/jurix/ScoreBar";
import { JudgeActivityFeed } from "@/components/jurix/JudgeActivityFeed";
import { ArrowUpRight, ThumbsUp } from "lucide-react";

export const Route = createFileRoute("/hackathons/$id/project/$projectId")({
  loader: ({ params }): { hackathon: Hackathon; project: Project } => {
    const h = getHackathon(params.id);
    const p = getProject(params.projectId);
    if (!h || !p) throw notFound();
    return { hackathon: h, project: p };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.project.name} — JuriXAI` : "Project — JuriXAI" },
      { name: "description", content: loaderData?.project.description ?? "" },
      { property: "og:title", content: loaderData ? `${loaderData.project.name} — ${loaderData.hackathon.name}` : "Project — JuriXAI" },
      { property: "og:description", content: loaderData?.project.description ?? "" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { hackathon, project } = Route.useLoaderData();
  const [voted, setVoted] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link
        to="/hackathons/$id"
        params={{ id: hackathon.id }}
        className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-accent"
      >
        ← {hackathon.name}
      </Link>

      <header className="mt-6 mb-10 grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-border-dim pb-10">
        <div className="lg:col-span-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ai mb-3">{project.teamName}</p>
          <h1 className="text-3xl md:text-5xl font-headline italic font-normal tracking-tight mb-4">{project.name}</h1>
          <p className="text-muted-foreground text-pretty mb-6">{project.description}</p>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            <a href={project.githubUrl} target="_blank" rel="noreferrer" className="border border-border-dim px-3 py-1.5 hover:border-accent transition-colors flex items-center gap-1.5 uppercase tracking-widest">
              GITHUB <ArrowUpRight className="size-3" />
            </a>
            {project.demoUrl && (
              <a href={project.demoUrl} target="_blank" rel="noreferrer" className="border border-border-dim px-3 py-1.5 hover:border-accent transition-colors flex items-center gap-1.5 uppercase tracking-widest">
                LIVE_DEMO <ArrowUpRight className="size-3" />
              </a>
            )}
            <a href={project.videoUrl} target="_blank" rel="noreferrer" className="border border-border-dim px-3 py-1.5 hover:border-accent transition-colors flex items-center gap-1.5 uppercase tracking-widest">
              VIDEO <ArrowUpRight className="size-3" />
            </a>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">PAYOUT_WALLET</p>
            <WalletAddress address={project.teamWalletAddress} />
          </div>
        </div>
        <div className="lg:col-span-4 border border-accent/30 bg-accent/5 p-6 flex flex-col items-center text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">COMPOSITE_SCORE</p>
          <p className="text-6xl md:text-7xl font-extrabold text-accent tabular-nums">
            {(project.compositeScore / 10).toFixed(2)}
          </p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1 mb-6">/ 10.00</p>
          <div className="w-full grid grid-cols-2 gap-4 mb-6 font-mono text-xs">
            <div>
              <p className="text-[9px] uppercase text-muted-foreground">AI_SCORE</p>
              <p className="text-lg font-bold tabular-nums">{(project.aiScore / 10).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground">VOTES</p>
              <p className="text-lg font-bold tabular-nums">{project.communityVotes + (voted ? 1 : 0)}</p>
            </div>
          </div>
          <button
            onClick={() => setVoted(true)}
            disabled={voted}
            className={`w-full px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
              voted
                ? "border border-border-dim text-muted-foreground cursor-not-allowed"
                : "border border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <ThumbsUp className="size-3" />
            {voted ? "VOTE_CAST" : "COMMUNITY_VOTE"}
          </button>
        </div>
      </header>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-mono tracking-widest text-muted-foreground uppercase">AI_SCORING_BREAKDOWN</h2>
          <div className="h-px flex-1 bg-border-dim" />
        </div>
        <div className="border border-border-dim">
          <table className="w-full font-mono text-xs">
            <thead className="border-b border-border-dim">
              <tr className="text-left text-muted-foreground">
                <th className="p-4 font-normal">CRITERION</th>
                <th className="p-4 font-normal">JUDGE</th>
                <th className="p-4 font-normal w-24">WEIGHT</th>
                <th className="p-4 font-normal w-48">SCORE</th>
                <th className="p-4 font-normal hidden md:table-cell">RATIONALE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim">
              {hackathon.criteria.map((c: typeof hackathon.criteria[number], i: number) => {
                const s = project.scores.find((x: typeof project.scores[number]) => x.criterionId === c.id);
                return (
                  <tr key={c.id} className="align-top">
                    <td className="p-4 font-bold text-foreground">{c.name}</td>
                    <td className="p-4 text-ai">{c.assignedJudge.toUpperCase()}</td>
                    <td className="p-4 tabular-nums text-accent">{c.weight}%</td>
                    <td className="p-4">
                      <ScoreBar score={s?.score ?? 0} delay={i * 60} />
                    </td>
                    <td className="p-4 text-muted-foreground leading-relaxed text-[11px] hidden md:table-cell max-w-md">
                      {s?.rationale}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-mono tracking-widest text-muted-foreground uppercase">JUDGE_ACTIVITY</h2>
          <div className="h-px flex-1 bg-border-dim" />
        </div>
        <JudgeActivityFeed title="PROJECT_FEED" />
      </section>
    </div>
  );
}
