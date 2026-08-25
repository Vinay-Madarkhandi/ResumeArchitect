import { cn } from "@/lib/cn";

/** A pulsing placeholder block for loading.tsx route skeletons — never used
 * for a fabricated "AI is thinking" progress illusion, only literal layout
 * placeholders while a server component's data fetch is in flight. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-container-high", className)} />;
}
