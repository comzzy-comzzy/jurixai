import { stats } from "@/lib/mock-data";
import { formatUsdc } from "@/lib/format";

const items = [
  { label: "ACTIVE_HACKATHONS", value: stats.activeHackathons.toString(), accent: false },
  { label: "TOTAL_SUBMISSIONS", value: stats.totalSubmissions.toLocaleString(), accent: false },
  { label: "USDC_DISTRIBUTED", value: formatUsdc(stats.usdcDistributed), accent: false },
  { label: "VERDICTS_RENDERED", value: stats.verdictsRendered.toLocaleString(), accent: true },
];

export function StatsBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border-dim border border-border-dim">
      {items.map((s) => (
        <div key={s.label} className="bg-background p-5">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">{s.label}</p>
          <p className={`text-3xl font-bold tracking-tight tabular-nums ${s.accent ? "text-accent" : ""}`}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
