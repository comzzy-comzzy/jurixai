import { activityFeed } from "@/lib/mock-data";

const colorMap: Record<string, string> = {
  ai: "text-ai",
  accent: "text-accent",
  warn: "text-warn",
};

export function JudgeActivityFeed({ title = "Live feed" }: { title?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-3">
        {activityFeed.map((e, i) => (
          <div key={i} className="flex justify-between gap-3 text-xs">
            <span className="text-muted-foreground shrink-0 font-mono tabular-nums">{e.ts}</span>
            <span className={`${colorMap[e.color] ?? "text-foreground"} text-right`}>
              <span className="font-semibold mr-1">{e.judge}</span>
              {e.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
