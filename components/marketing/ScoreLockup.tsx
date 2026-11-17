import { cn } from "@/lib/cn";

/**
 * Before → now, set like a slug: the original figure struck in vermilion,
 * the current figure seated on a brass rule, the gain in small mono.
 */
export function ScoreLockup({
  before,
  now,
  size = "md",
  className,
}: {
  before: number;
  now: number;
  size?: "md" | "lg";
  className?: string;
}) {
  const gain = now - before;
  const lg = size === "lg";
  return (
    <div className={cn("flex items-end gap-4", className)}>
      <div>
        <p className="text-label text-ink-3">Original</p>
        <p
          className={cn(
            "mt-1 font-mono leading-none text-ink-3 line-through decoration-del/70 decoration-[1.5px] tabular",
            lg ? "text-[34px] leading-none" : "text-[22px] leading-none",
          )}
        >
          {before}
        </p>
      </div>
      <div className={cn("h-px flex-1 bg-line-strong", lg ? "mb-3" : "mb-2")} aria-hidden />
      <div className="text-right">
        <p className="text-label text-ink-3">
          Now{" "}
          <span className={cn("font-mono tabular", gain >= 0 ? "text-add" : "text-del")}>
            {gain >= 0 ? "+" : "−"}
            {Math.abs(gain)}
          </span>
        </p>
        <p
          className={cn(
            "mt-1 ml-auto block w-fit border-b-2 border-brass pb-1 font-mono font-medium leading-none text-ink tabular",
            lg ? "text-[64px] leading-none" : "text-[40px] leading-none",
          )}
        >
          {now}
        </p>
      </div>
    </div>
  );
}
