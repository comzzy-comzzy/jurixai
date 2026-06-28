import { Link } from "@tanstack/react-router";
import type { SubmissionSummary } from "@/lib/jurix/types";
import { ScoreBar } from "./ScoreBar";
import { WalletAddress } from "./WalletAddress";

export function Leaderboard({
  hackathonId,
  projects,
}: {
  hackathonId: string;
  projects: SubmissionSummary[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border">
            <th className="py-3 px-5 font-medium">Rank</th>
            <th className="py-3 px-5 font-medium">Project</th>
            <th className="py-3 px-5 font-medium hidden md:table-cell">Team wallet</th>
            <th className="py-3 px-5 font-medium">Composite</th>
            <th className="py-3 px-5 font-medium w-48 hidden sm:table-cell">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p, i) => (
            <tr key={p.id} className="group hover:bg-muted/50 transition-colors">
              <td className="py-4 px-5">
                <span
                  className={`inline-grid place-items-center size-7 rounded-full text-xs font-bold tabular-nums ${i === 0 ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="py-4 px-5">
                <Link
                  to="/hackathons/$id/project/$projectId"
                  params={{ id: hackathonId, projectId: p.id }}
                  className="font-semibold text-foreground hover:text-accent transition-colors"
                >
                  {p.project_name}
                </Link>
                <div className="text-xs text-muted-foreground mt-0.5">{p.team_name}</div>
              </td>
              <td className="py-4 px-5 hidden md:table-cell">
                <WalletAddress address={p.payout_address} />
              </td>
              <td className="py-4 px-5 font-bold tabular-nums">
                {(p.weighted_score / 10).toFixed(2)}
                <span className="text-xs text-muted-foreground font-normal"> / 10.00</span>
              </td>
              <td className="py-4 px-5 w-48 hidden sm:table-cell">
                <ScoreBar score={p.weighted_score / 10} delay={i * 80} showLabel={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
