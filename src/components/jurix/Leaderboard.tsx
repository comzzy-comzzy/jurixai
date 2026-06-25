import { Link } from "@tanstack/react-router";
import type { Project } from "@/lib/mock-data";
import { ScoreBar } from "./ScoreBar";
import { WalletAddress } from "./WalletAddress";

export function Leaderboard({ hackathonId, projects }: { hackathonId: string; projects: Project[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border-dim">
            <th className="py-4 pr-4 font-normal">RANK</th>
            <th className="py-4 pr-4 font-normal">PROJECT</th>
            <th className="py-4 pr-4 font-normal hidden md:table-cell">TEAM_WALLET</th>
            <th className="py-4 pr-4 font-normal">COMPOSITE</th>
            <th className="py-4 font-normal w-48 hidden sm:table-cell">PROGRESS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-dim">
          {projects.map((p, i) => (
            <tr key={p.id} className="group">
              <td className={`py-5 pr-4 font-bold ${i === 0 ? "text-accent" : "text-foreground/80"}`}>
                {String(i + 1).padStart(2, "0")}
              </td>
              <td className="py-5 pr-4">
                <Link
                  to="/hackathons/$id/project/$projectId"
                  params={{ id: hackathonId, projectId: p.id }}
                  className="font-bold text-foreground hover:text-accent transition-colors"
                >
                  {p.name}
                </Link>
                <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{p.teamName}</div>
              </td>
              <td className="py-5 pr-4 hidden md:table-cell">
                <WalletAddress address={p.teamWalletAddress} />
              </td>
              <td className="py-5 pr-4 font-bold tabular-nums">
                {(p.compositeScore / 10).toFixed(2)}
                <span className="text-[10px] text-muted-foreground font-normal"> / 10.00</span>
              </td>
              <td className="py-5 w-48 hidden sm:table-cell">
                <ScoreBar score={p.compositeScore / 10} delay={i * 80} showLabel={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
