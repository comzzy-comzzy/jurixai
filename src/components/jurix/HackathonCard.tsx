import { Link } from "@tanstack/react-router";
import type { HackathonSummary } from "@/lib/jurix/types";
import { fullUsdc } from "@/lib/format";
import { StatusPill } from "./StatusPill";
import { Countdown } from "./Countdown";
import { ArrowUpRight } from "lucide-react";

export function HackathonCard({
  hackathon,
  index,
  submissionCount,
}: {
  hackathon: HackathonSummary;
  index: number;
  submissionCount: number;
}) {
  const isOpen = hackathon.status === "open";
  return (
    <Link
      to="/hackathons/$id"
      params={{ id: hackathon.id }}
      className="group rounded-xl border border-border bg-card p-6 relative flex flex-col shadow-sm hover:shadow-md hover:border-input transition-all"
    >
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <StatusPill status={hackathon.status} />
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-accent transition-colors" />
        </div>
        <h3 className="text-xl font-bold tracking-tight mb-1 group-hover:text-accent transition-colors">
          {hackathon.name}
        </h3>
        <p className="text-sm text-muted-foreground">by {hackathon.organizerName}</p>
      </div>
      <div className="mt-auto space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Prize pool</p>
            <p className="text-xl font-bold tabular-nums">
              {fullUsdc(hackathon.prizePoolUsdc)}{" "}
              <span className="text-sm font-semibold text-muted-foreground">USDC</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">
              {isOpen ? "Closes in" : hackathon.status === "judging" ? "Status" : "Result"}
            </p>
            {isOpen ? (
              <Countdown to={hackathon.deadline} className="text-sm" />
            ) : hackathon.status === "judging" ? (
              <p className="text-sm font-medium text-warn">Calculating</p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Closed</p>
            )}
          </div>
        </div>
        <div className="pt-4 border-t border-border flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{submissionCount} submissions</span>
          <span className="font-semibold text-foreground group-hover:text-accent transition-colors">
            {hackathon.status === "closed"
              ? "View results"
              : hackathon.status === "judging"
                ? "Monitor judges"
                : "View details"}
          </span>
        </div>
      </div>
    </Link>
  );
}
