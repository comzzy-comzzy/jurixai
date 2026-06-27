import type { HackathonStatus } from "@/lib/mock-data";

const map: Record<HackathonStatus, string> = {
  open: "bg-accent/10 text-accent",
  judging: "bg-warn/10 text-warn",
  closed: "bg-muted text-muted-foreground",
};

const label: Record<HackathonStatus, string> = {
  open: "Open",
  judging: "Judging",
  closed: "Closed",
};

export function StatusPill({ status }: { status: HackathonStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label[status]}
    </span>
  );
}
