export function truncateAddr(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

function safeNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function formatUsdc(n: number | null | undefined): string {
  const value = safeNumber(n);
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function fullUsdc(n: number | null | undefined): string {
  return safeNumber(n).toLocaleString("en-US");
}

export function countdown(toIso: string): string {
  const diff = new Date(toIso).getTime() - Date.now();
  if (diff <= 0) return "ENDED";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${String(d).padStart(2, "0")}D:${String(h).padStart(2, "0")}H:${String(m).padStart(2, "0")}M`;
}

export function relativeDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
