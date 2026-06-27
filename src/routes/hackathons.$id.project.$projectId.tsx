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
      {
        property: "og:title",
        content: loaderData
          ? `${loaderData.project.name} — ${loaderData.hackathon.name}`
          : "Project — JuriXAI",
      },
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
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← {hackathon.name}
      </Link>

      <header className="mt-6 mb-10 grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-border pb-10">
        <div className="lg:col-span-8">
          <p className="text-sm font-semibold text-ai mb-3">{project.teamName}</p>
          <h1 className="text-3xl md:text-5xl font-bold italic tracking-tight mb-4">{project.name}</h1>
          <p className="text-lg text-muted-foreground text-pretty mb-6">{project.description}</p>
          <div className="flex flex-wrap gap-2 text-sm font-medium">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-3.5 py-1.5 hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              GitHub <ArrowUpRight className="size-3.5" />
            </a>
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-3.5 py-1.5 hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                Live demo <ArrowUpRight className="size-3.5" />
              </a>
            )}
            <a
              href={project.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-3.5 py-1.5 hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              Video <ArrowUpRight className="size-3.5" />
            </a>
          </div>
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Payout wallet</p>
            <WalletAddress address={project.teamWalletAddress} />
          </div>
        </div>
        <div className="lg:col-span-4 rounded-xl border border-accent/30 bg-accent/5 p-6 flex flex-col items-center text-center">
          <p className="text-xs font-medium text-muted-foreground mb-2">Composite score</p>
          <p className="text-6xl md:text-7xl font-extrabold text-accent tabular-nums">
            {(project.compositeScore / 10).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-6">/ 10.00</p>
          <div className="w-full grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">AI score</p>
              <p className="text-lg font-bold tabular-nums">{(project.aiScore / 10).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Votes</p>
              <p className="text-lg font-bold tabular-nums">
                {project.communityVotes + (voted ? 1 : 0)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVoted(true)}
            disabled={voted}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              voted
                ? "border border-border text-muted-foreground cursor-not-allowed"
                : "bg-accent text-accent-foreground shadow-sm hover:opacity-90"
            }`}
          >
            <ThumbsUp className="size-4" />
            {voted ? "Vote cast" : "Community vote"}
          </button>
        </div>
      </header>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">AI scoring breakdown</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="p-4 font-medium">Criterion</th>
                <th className="p-4 font-medium">Judge</th>
                <th className="p-4 font-medium w-24">Weight</th>
                <th className="p-4 font-medium w-48">Score</th>
                <th className="p-4 font-medium hidden md:table-cell">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hackathon.criteria.map((c: (typeof hackathon.criteria)[number], i: number) => {
                const s = project.scores.find(
                  (x: (typeof project.scores)[number]) => x.criterionId === c.id,
                );
                return (
                  <tr key={c.id} className="align-top">
                    <td className="p-4 font-semibold text-foreground">{c.name}</td>
                    <td className="p-4 font-medium text-ai">{c.assignedJudge}</td>
                    <td className="p-4 tabular-nums text-accent font-medium">{c.weight}%</td>
                    <td className="p-4">
                      <ScoreBar score={s?.score ?? 0} delay={i * 60} />
                    </td>
                    <td className="p-4 text-muted-foreground leading-relaxed text-xs hidden md:table-cell max-w-md">
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
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Judge activity</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <JudgeActivityFeed title="Project feed" />
      </section>
    </div>
  );
}
