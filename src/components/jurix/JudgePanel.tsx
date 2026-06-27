import type { Judge } from "@/lib/mock-data";

function StatusDot({ status }: { status: Judge["status"] }) {
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
  return <span className="text-xs font-medium text-muted-foreground">Idle</span>;
}

const order = ["Vex", "Kael", "Oryn", "Zera", "Dusk"];
function judgeIndex(j: Judge) {
  const i = order.indexOf(j.name);
  return i === -1 ? 1 : i + 1;
}

export function JudgeRow({ judge }: { judge: Judge }) {
  const c = judge.colorHex;
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 shadow-sm">
      <div
        className="size-12 shrink-0 grid place-items-center rounded-full"
        style={{ background: `${c}1f`, color: c }}
      >
        <span className="text-sm font-bold">{judge.initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            {judge.name}-{String(judgeIndex(judge)).padStart(2, "0")}
          </span>
          <StatusDot status={judge.status} />
        </div>
        <div className="flex justify-between gap-2 mt-1 text-xs">
          <span className="text-muted-foreground">
            {judge.reviewsTotal.toLocaleString()} verdicts
          </span>
          <span className="truncate font-medium" style={{ color: c }}>
            {judge.focus}
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
  judges: Judge[];
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

export function JudgeGrid({ judges }: { judges: Judge[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {judges.map((j) => {
        const c = j.colorHex;
        return (
          <div
            key={j.name}
            className="rounded-xl border border-border bg-card p-5 flex flex-col items-center gap-3 shadow-sm"
          >
            <div
              className="size-14 grid place-items-center rounded-full"
              style={{ background: `${c}1f`, color: c }}
            >
              <span className="text-base font-bold">{j.initial}</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tight" style={{ color: c }}>
                {j.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{j.focus}</p>
            </div>
            <StatusDot status={j.status} />
            <p className="text-xs text-muted-foreground">{j.reviewsTotal} total</p>
          </div>
        );
      })}
    </div>
  );
}
