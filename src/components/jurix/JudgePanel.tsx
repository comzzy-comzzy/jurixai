import type { Judge } from "@/lib/mock-data";

function StatusDot({ status }: { status: Judge["status"] }) {
  if (status === "reviewing") {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-mono text-warn uppercase">
        <span className="size-1 bg-warn rounded-full animate-pulse-dot" /> REVIEWING
      </span>
    );
  }
  if (status === "done") {
    return <span className="flex items-center gap-1.5 text-[9px] font-mono text-accent uppercase">DONE</span>;
  }
  return <span className="text-[9px] font-mono text-muted-foreground uppercase">IDLE</span>;
}

export function JudgeRow({ judge, highlight }: { judge: Judge; highlight?: boolean }) {
  return (
    <div
      className={`p-4 border flex items-center gap-4 ${
        highlight ? "bg-ai/5 border-ai/20" : "bg-card border-border-dim"
      }`}
    >
      <div className="size-12 shrink-0 grid place-items-center bg-ai/15 border border-ai/30">
        <span className="text-xs font-mono font-bold text-ai">{judge.initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <span className="text-sm font-bold tracking-tight uppercase">{judge.name}-{String(judges_index(judge)).padStart(2, "0")}</span>
          <StatusDot status={judge.status} />
        </div>
        <div className="flex justify-between gap-2 mt-2 text-[10px] font-mono">
          <span className="text-muted-foreground">VERDICTS: {judge.reviewsTotal.toLocaleString()}</span>
          <span className="text-ai truncate">{judge.focus.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

// keep index stable based on judge name order
const order = ["Lexi", "Mira", "Aris", "Nova", "Sage"];
function judges_index(j: Judge) {
  const i = order.indexOf(j.name);
  return i === -1 ? 1 : i + 1;
}

export function JudgePanel({ judges, title = "AI_JUDGE_CORE" }: { judges: Judge[]; title?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xs font-mono tracking-widest text-muted-foreground uppercase">{title}</h2>
        <div className="h-px flex-1 bg-border-dim" />
      </div>
      {judges.map((j) => (
        <JudgeRow key={j.name} judge={j} />
      ))}
    </div>
  );
}

export function JudgeGrid({ judges }: { judges: Judge[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border-dim border border-border-dim">
      {judges.map((j) => (
        <div key={j.name} className="bg-background p-4 flex flex-col items-center gap-3">
          <div className="size-14 grid place-items-center bg-ai/15 border border-ai/30">
            <span className="text-sm font-mono font-bold text-ai">{j.initial}</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-tight">{j.name}</p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">{j.focus}</p>
          </div>
          <StatusDot status={j.status} />
          <p className="text-[10px] font-mono text-muted-foreground">{j.reviewsTotal} TOTAL</p>
        </div>
      ))}
    </div>
  );
}
