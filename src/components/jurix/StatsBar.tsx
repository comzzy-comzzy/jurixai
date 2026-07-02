import { formatUsdc } from "@/lib/format";
import type { HomeStats } from "@/lib/jurix/types";

export function StatsBar({ stats }: { stats: HomeStats }) {
  const activeHackathons = Number(stats.active_hackathons ?? 0);
  const totalSubmissions = Number(stats.total_submissions ?? 0);
  const usdcDistributed = Number(stats.usdc_distributed ?? 0);
  const verdictsRendered = Number(stats.verdicts_rendered ?? 0);

  const items = [
    { label: "Active hackathons", value: activeHackathons.toString(), accent: false },
    { label: "Total submissions", value: totalSubmissions.toLocaleString(), accent: false },
    { label: "USDC distributed", value: formatUsdc(usdcDistributed), accent: true },
    { label: "Verdicts rendered", value: verdictsRendered.toLocaleString(), accent: false },
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
