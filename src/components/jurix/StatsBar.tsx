import { stats } from "@/lib/mock-data";
import { formatUsdc } from "@/lib/format";

const items = [
  { label: "Active hackathons", value: stats.activeHackathons.toString(), accent: false },
  { label: "Total submissions", value: stats.totalSubmissions.toLocaleString(), accent: false },
  { label: "USDC distributed", value: formatUsdc(stats.usdcDistributed), accent: true },
  { label: "Verdicts rendered", value: stats.verdictsRendered.toLocaleString(), accent: false },
];

export function StatsBar() {
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
