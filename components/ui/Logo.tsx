import Link from "next/link";
import { cn } from "@/lib/cn";

/** Wordmark: a brass composing-stick rule under a set "R". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="var(--raised)" stroke="var(--line-strong)" />
      <path d="M8 17V7h4.6a3 3 0 0 1 0 6H8m4.2 0L16 17" fill="none" stroke="var(--ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 19.5h12" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-md text-ink", className)}>
      <LogoMark />
      <span className="hidden text-[15px] font-semibold tracking-[-0.01em] min-[420px]:inline">
        Resume<span className="text-ink-3">Architect</span>
      </span>
    </Link>
  );
}
