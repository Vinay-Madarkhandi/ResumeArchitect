import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** "48 → 76" set in mono, with the gain in verdigris. */
export function ScoreDelta({ before, after, className }: { before: number | null; after: number | null; className?: string }) {
  if (after === null) return <span className="text-small text-ink-3">—</span>;
  const gain = before === null ? null : after - before;
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 font-mono tabular", className)} aria-label={`Match score ${before ?? "unknown"} to ${after}`}>
      {before !== null && (
        <>
          <span className="text-ink-3">{before}</span>
          <ArrowRight className="size-3 self-center text-ink-3" aria-hidden />
        </>
      )}
      <span className="font-medium text-ink">{after}</span>
      {gain !== null && gain !== 0 && (
        <span className={cn("text-label", gain > 0 ? "text-add" : "text-del")}>{gain > 0 ? `+${gain}` : gain}</span>
      )}
    </span>
  );
}
