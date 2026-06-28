import type { ActivityEvent } from "@/lib/jurix/types";

const colorMap: Record<ActivityEvent["tone"], string> = {
  ai: "text-ai",
  accent: "text-accent",
  warn: "text-warn",
  muted: "text-muted-foreground",
};

export function JudgeActivityFeed({
  title = "Live feed",
  events,
  emptyMessage = "No evaluations have been recorded yet.",
}: {
  title?: string;
  events: ActivityEvent[];
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <div
              key={`${event.agent_name}-${event.ts}-${i}`}
              className="flex justify-between gap-3 text-xs"
            >
              <span className="text-muted-foreground shrink-0 font-mono tabular-nums">
                {event.ts}
              </span>
              <span className={`${colorMap[event.tone] ?? "text-foreground"} text-right`}>
                <span className="font-semibold mr-1">{event.agent_name}</span>
                {event.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
