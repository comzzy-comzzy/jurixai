import { Link } from "@tanstack/react-router";
import type { Hackathon } from "@/lib/mock-data";
import { fullUsdc } from "@/lib/format";
import { StatusPill } from "./StatusPill";
import { Countdown } from "./Countdown";

export function HackathonCard({ hackathon, index, submissionCount }: { hackathon: Hackathon; index: number; submissionCount: number }) {
  const num = String(index + 1).padStart(3, "0");
  const isOpen = hackathon.status === "open";
  return (
    <Link
      to="/hackathons/$id"
      params={{ id: hackathon.id }}
      className="group border border-border-dim p-6 relative flex flex-col hover:border-accent transition-colors bg-background"
    >
      <span className="absolute top-4 right-6 font-mono text-[10px] text-muted-foreground">#{num}</span>
      <div className="mb-8">
        <div className="mb-4">
          <StatusPill status={hackathon.status} />
        </div>
        <h3 className="text-2xl font-bold tracking-tight mb-1 group-hover:text-accent transition-colors">
          {hackathon.name}
        </h3>
        <p className="text-xs font-mono text-muted-foreground uppercase">BY {hackathon.organizerName}</p>
      </div>
      <div className="mt-auto space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase">Prize Pool</p>
            <p className="text-xl font-bold tabular-nums">{fullUsdc(hackathon.prizePoolUsdc)} USDC</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
              {isOpen ? "Closes In" : hackathon.status === "judging" ? "Status" : "Finalized"}
            </p>
            {isOpen ? (
              <Countdown to={hackathon.deadline} className="text-xs" />
            ) : hackathon.status === "judging" ? (
              <p className="text-xs font-mono text-warn">CALCULATING</p>
            ) : (
              <p className="text-xs font-mono text-muted-foreground">CLOSED</p>
            )}
          </div>
        </div>
        <div className="pt-4 border-t border-border-dim flex justify-between items-center text-[10px] font-mono text-muted-foreground">
          <span>SUBMISSIONS: {submissionCount}</span>
          <span className="text-foreground group-hover:text-accent transition-colors">
            {hackathon.status === "closed" ? "VIEW_RESULTS →" : hackathon.status === "judging" ? "MONITOR_JUDGES →" : "VIEW_DETAILS →"}
          </span>
        </div>
      </div>
    </Link>
  );
}
