import { activityFeed } from "@/lib/mock-data";

const colorMap: Record<string, string> = {
  ai: "text-ai",
  accent: "text-accent",
  warn: "text-warn",
};

export function JudgeActivityFeed({ title = "LIVE_FEED" }: { title?: string }) {
  return (
    <div className="p-4 border border-border-dim bg-background">
      <p className="text-[10px] font-mono text-muted-foreground mb-4 uppercase tracking-widest">{title}</p>
      <div className="space-y-3">
        {activityFeed.map((e, i) => (
          <div key={i} className="flex justify-between gap-3 text-[10px] font-mono">
            <span className="text-muted-foreground shrink-0">{e.ts}</span>
            <span className={`${colorMap[e.color] ?? "text-foreground"} text-right`}>
              <span className="font-bold mr-1">{e.judge}</span>{e.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
