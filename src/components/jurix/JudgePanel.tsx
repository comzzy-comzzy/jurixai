import type { JudgeAgent } from "@/lib/jurix/types";

function StatusDot({ status }: { status: JudgeAgent["status"] }) {
  if (status === "reviewing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warn">
        <span className="size-1.5 rounded-full bg-warn animate-pulse-dot" /> Reviewing
      </span>
    );
  }
  if (status === "done") {
    return <span className="text-xs font-medium text-accent">Done</span>;
  }
  if (status === "offline") {
    return <span className="text-xs font-medium text-muted-foreground">Offline</span>;
  }
  return <span className="text-xs font-medium text-muted-foreground">Idle</span>;
}

const order = ["Vex", "Kael", "Oryn", "Zera", "Dusk"];
function judgeIndex(j: JudgeAgent) {
  const i = order.indexOf(j.name);
  return i === -1 ? 1 : i + 1;
}

export function JudgeRow({ judge }: { judge: JudgeAgent }) {
  const c = judge.color_hex;
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 shadow-sm">
      <div
        className="size-12 shrink-0 grid place-items-center rounded-full"
        style={{ background: `${c}1f`, color: c }}
      >
        <span className="text-sm font-bold">{judge.short_code}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            {judge.name}-{String(judgeIndex(judge)).padStart(2, "0")}
          </span>
          <StatusDot status={judge.status} />
        </div>
        <div className="flex justify-between gap-2 mt-1 text-xs">
          <span className="text-muted-foreground">{judge.weight_percent}% weight</span>
          <span className="truncate font-medium" style={{ color: c }}>
            {judge.focus_area}
          </span>
        </div>
      </div>
    </div>
  );
}

export function JudgePanel({
  judges,
  title = "AI judge core",
}: {
  judges: JudgeAgent[];
  title?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {judges.map((j) => (
        <JudgeRow key={j.name} judge={j} />
      ))}
    </div>
  );
}

export function JudgeGrid({ judges }: { judges: JudgeAgent[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {judges.map((j) => {
        const c = j.color_hex;
        return (
          <div
            key={j.name}
            className="rounded-xl border border-border bg-card p-5 flex flex-col items-center gap-3 shadow-sm"
          >
            <div
              className="size-14 grid place-items-center rounded-full"
              style={{ background: `${c}1f`, color: c }}
            >
              <span className="text-base font-bold">{j.short_code}</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tight" style={{ color: c }}>
                {j.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{j.focus_area}</p>
            </div>
            <StatusDot status={j.status} />
            <p className="text-xs text-muted-foreground">{j.weight_percent}% total weight</p>
          </div>
        );
      })}
    </div>
  );
}
