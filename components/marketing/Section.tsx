import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Page column shared by every marketing section. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

/** Secondary marketing heading: Bodoni at the secondary display size. */
export function DisplayHeading({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "font-display text-[clamp(2rem,3.6vw,2.75rem)] font-normal leading-[1.05] tracking-[-0.015em] text-balance text-ink",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Lede({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("max-w-[38rem] text-lead text-pretty text-ink-2", className)}>{children}</p>;
}
