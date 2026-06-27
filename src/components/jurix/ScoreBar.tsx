export function ScoreBar({
  score,
  max = 10,
  delay = 0,
  showLabel = true,
}: {
  score: number;
  max?: number;
  delay?: number;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {score.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">/ {max.toFixed(2)}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-accent animate-score-grow"
          style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}
