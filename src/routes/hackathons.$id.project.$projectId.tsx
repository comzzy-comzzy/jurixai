import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { loadSubmissionDetail } from "@/lib/jurix/actions.server";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { ScoreBar } from "@/components/jurix/ScoreBar";
import { JudgeActivityFeed } from "@/components/jurix/JudgeActivityFeed";
import { ArrowUpRight, ThumbsUp } from "lucide-react";

export const Route = createFileRoute("/hackathons/$id/project/$projectId")({
  loader: async ({ params }) => {
    try {
      return await loadSubmissionDetail({
        data: { hackathon_id: params.id, submission_id: params.projectId },
      });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.project_name} — JuriXAI` : "Project — JuriXAI" },
      { name: "description", content: loaderData?.description ?? "" },
      {
        property: "og:title",
        content: loaderData
          ? `${loaderData.project_name} — ${loaderData.hackathon.name}`
          : "Project — JuriXAI",
      },
      { property: "og:description", content: loaderData?.description ?? "" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const project = Route.useLoaderData();
  const [voted, setVoted] = useState(false);
  const agentNameById = new Map(project.agents.map((agent) => [agent.id, agent.name]));
  const agentById = new Map(project.agents.map((agent) => [agent.id, agent]));
  const scoreByCriterionId = new Map(project.scores.map((score) => [score.criterion_id, score]));
  const totalRawScore =
    project.scores.length > 0
      ? project.scores.reduce((sum, score) => sum + score.score, 0) / project.scores.length
      : 0;
  const scoredBreakdown = project.criteria
    .map((criterion) => {
      const score = scoreByCriterionId.get(criterion.id);
      const agent = criterion.agent_id ? agentById.get(criterion.agent_id) : null;
      return {
        criterion,
        score,
        agent,
      };
    })
    .filter((item) => item.score);
  const weightedTotalFromBreakdown = scoredBreakdown.reduce(
    (sum, item) => sum + (item.score?.weighted_points ?? 0),
    0,
  );

  const activity = useMemo(
    () =>
      project.scores.map((score, index) => {
        return {
          ts: new Date(score.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
          agent_name: agentNameById.get(score.agent_id) ?? `Judge ${index + 1}`,
          tone: score.flags && score.flags.length > 0 ? ("warn" as const) : ("accent" as const),
          text:
            score.flags && score.flags.length > 0
              ? `Flagged: ${score.flags.join(", ")}`
              : (score.rationale ?? "Completed a scoring pass."),
        };
      }),
    [agentNameById, project],
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link
        to="/hackathons/$id"
        params={{ id: project.hackathon.id }}
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← {project.hackathon.name}
      </Link>

      <header className="mt-6 mb-10 grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-border pb-10">
        <div className="lg:col-span-8">
          <p className="text-sm font-semibold text-ai mb-3">{project.team_name}</p>
          <h1 className="text-3xl md:text-5xl font-bold italic tracking-tight mb-4">
            {project.project_name}
          </h1>
          <p className="text-lg text-muted-foreground text-pretty mb-6">
            {project.description ?? "No project description yet."}
          </p>
          <div className="flex flex-wrap gap-2 text-sm font-medium">
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-3.5 py-1.5 hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                GitHub <ArrowUpRight className="size-3.5" />
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-3.5 py-1.5 hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                Live demo <ArrowUpRight className="size-3.5" />
              </a>
            )}
            {project.video_url && (
              <a
                href={project.video_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-3.5 py-1.5 hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                Video <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </div>
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Payout wallet</p>
            <WalletAddress address={project.payout_address} />
          </div>
        </div>
        <div className="lg:col-span-4 rounded-xl border border-accent/30 bg-accent/5 p-6 flex flex-col items-center text-center">
          <p className="text-xs font-medium text-muted-foreground mb-2">Final weighted total</p>
          <p className="text-6xl md:text-7xl font-extrabold text-accent tabular-nums">
            {project.weighted_score.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-6">Weighted across all judge criteria</p>
          <div className="w-full grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Average raw score</p>
              <p className="text-lg font-bold tabular-nums">{totalRawScore.toFixed(2)} / 10</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Judge evaluations</p>
              <p className="text-lg font-bold tabular-nums">{project.scores.length}</p>
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
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">How this became {project.weighted_score.toFixed(1)}%</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {scoredBreakdown.map(({ criterion, score, agent }) => {
              const weighted = score?.weighted_points ?? 0;
              return (
                <div
                  key={criterion.id}
                  className="rounded-lg border border-border bg-background px-4 py-3"
                >
                  <p className="font-medium text-foreground">
                    {agent ? `${agent.name} (${agent.short_code})` : "Unassigned"} scored{" "}
                    <span className="tabular-nums">{score?.score.toFixed(2)} / 10</span> on{" "}
                    {criterion.name}
                  </p>
                  <p className="mt-1">
                    Weight {criterion.weight_percent}% × score {score?.score.toFixed(2)}/10 ={" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {weighted.toFixed(1)}%
                    </span>
                  </p>
                </div>
              );
            })}
            <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-foreground">
              <p className="font-medium">
                Final weighted total:{" "}
                <span className="tabular-nums">{weightedTotalFromBreakdown.toFixed(1)}%</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This total is the sum of every judge&apos;s weighted contribution, not an arbitrary score.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Per-agent scoring breakdown</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        {project.criteria.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No judging criteria configured yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="p-4 font-medium">Criterion</th>
                  <th className="p-4 font-medium">Agent</th>
                  <th className="p-4 font-medium w-24">Weight</th>
                  <th className="p-4 font-medium w-48">Raw score</th>
                  <th className="p-4 font-medium w-32">Weighted</th>
                  <th className="p-4 font-medium hidden md:table-cell">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.criteria.map((criterion, i) => {
                  const score = scoreByCriterionId.get(criterion.id);
                  const agent = criterion.agent_id ? agentById.get(criterion.agent_id) : null;
                  return (
                    <tr key={criterion.id} className="align-top">
                      <td className="p-4 font-semibold text-foreground">{criterion.name}</td>
                      <td className="p-4 font-medium text-ai">
                        {agent ? `${agent.name} (${agent.short_code})` : "Unassigned"}
                      </td>
                      <td className="p-4 tabular-nums text-accent font-medium">
                        {criterion.weight_percent}%
                      </td>
                      <td className="p-4">
                        <ScoreBar score={score?.score ?? 0} delay={i * 60} />
                      </td>
                      <td className="p-4 tabular-nums font-semibold text-foreground">
                        {score ? `${(score.weighted_points ?? 0).toFixed(1)}%` : "0.0%"}
                      </td>
                      <td className="p-4 text-muted-foreground leading-relaxed text-xs hidden md:table-cell max-w-md">
                        {score?.rationale ?? "No rationale recorded yet."}
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
          <h2 className="text-sm font-semibold text-foreground">Judge evidence and flags</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {scoredBreakdown.map(({ criterion, score, agent }) => (
            <div key={criterion.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {agent ? `${agent.name} (${agent.short_code})` : "Unassigned"} · {criterion.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {score?.confidence != null ? score.confidence.toFixed(2) : "N/A"} · Weight: {criterion.weight_percent}%
                  </p>
                </div>
                <div className="text-sm font-semibold tabular-nums text-accent">
                  {(score?.weighted_points ?? 0).toFixed(1)}%
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground">
                {score?.rationale ?? "No rationale recorded yet."}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Evidence used</p>
                  {score?.evidence && score.evidence.length > 0 ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {score.evidence.map((item, index) => (
                        <li key={index} className="rounded-md bg-muted/40 px-3 py-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No evidence recorded.</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Flags</p>
                  {score?.flags && score.flags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {score.flags.map((flag, index) => (
                        <span
                          key={index}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-warn"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No flags.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Judge activity</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <JudgeActivityFeed
          title="Project feed"
          events={activity}
          emptyMessage="No agent activity has been stored for this submission yet."
        />
      </section>
    </div>
  );
}
