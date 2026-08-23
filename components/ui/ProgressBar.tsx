import { cn } from "@/lib/cn";

/**
 * Thin (4px), square-terminal progress bar per DESIGN.md. Reserved for
 * literal determinate progress (upload %, parse steps) — never a fabricated
 * "AI confidence" meter.
 */
export function ProgressBar({
  value,
  className,
}: {
  value: number; // 0-100
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-1 w-full bg-surface-container-high", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-secondary transition-[width]" style={{ width: `${clamped}%` }} />
    </div>
  );
}
