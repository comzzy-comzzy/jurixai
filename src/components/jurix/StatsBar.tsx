import { formatUsdc } from "@/lib/format";
import type { HomeStats } from "@/lib/jurix/types";

export function StatsBar({ stats }: { stats: HomeStats }) {
  const items = [
    { label: "Active hackathons", value: stats.active_hackathons.toString(), accent: false },
    { label: "Total submissions", value: stats.total_submissions.toLocaleString(), accent: false },
    { label: "USDC distributed", value: formatUsdc(stats.usdc_distributed), accent: true },
    { label: "Verdicts rendered", value: stats.verdicts_rendered.toLocaleString(), accent: false },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">{s.label}</p>
          <p
            className={`text-3xl font-bold tracking-tight tabular-nums ${s.accent ? "text-accent" : "text-foreground"}`}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
