import type { HackathonStatus } from "@/lib/mock-data";

const map: Record<HackathonStatus, string> = {
  open: "bg-accent/10 text-accent",
  judging: "bg-warn/10 text-warn",
  closed: "bg-white/5 text-muted-foreground",
};

export function StatusPill({ status }: { status: HackathonStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${map[status]}`}>
      {status}
    </span>
  );
}
