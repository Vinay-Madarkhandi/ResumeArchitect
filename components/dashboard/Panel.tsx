import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** A titled region of the dashboard: hairline-bordered, one optional link to the full list. */
export function Panel({ id, title, count, action, className, children }: {
  id: string;
  title: string;
  count?: number;
  action?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("flex min-w-0 flex-col rounded-lg border border-line bg-panel", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 id={id} className="text-body font-semibold text-ink">
          {title}
          {count !== undefined && <span className="ml-2 font-mono text-small font-normal text-ink-3 tabular">{count}</span>}
        </h2>
        {action && (
          <Link href={action.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {action.label} <ArrowRight aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** What an empty region will hold, why it matters, and the one action that fills it. */
export function EmptyState({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="px-4 py-6">
      <p className="text-body font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-small text-ink-2">{children}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}
