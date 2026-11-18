import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import type { queueHealth } from "@/lib/admin/queues";
import { queueStates } from "@/lib/admin/queues";

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
});

export function dateTime(value: string | number | null | undefined) {
  return value == null ? "—" : dateFormat.format(new Date(value));
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-page font-semibold">{title}</h1>
      {children && <p className="mt-1 text-body text-ink-2">{children}</p>}
    </header>
  );
}

export function Panel({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-line bg-panel p-4", className)}>
      {title && <h2 className="mb-3 text-lead font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <dt className="text-small text-ink-2">{label}</dt>
      <dd className="mt-2 font-mono text-page font-medium tabular-nums">{value}</dd>
      {detail && <dd className="mt-1 text-label text-ink-3">{detail}</dd>}
    </div>
  );
}

export function DataTable({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-panel">
      <table className="w-full text-left text-body [&_td]:px-4 [&_td]:py-3 [&_td]:align-top">
        <caption className="sr-only">{title}</caption>
        <thead className="border-b border-line bg-sunken text-small text-ink-2">
          <tr>{headers.map((header) => <th key={header} scope="col" className="px-4 py-2 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ columns, children }: { columns: number; children: ReactNode }) {
  return <tr><td colSpan={columns} className="text-ink-2">{children}</td></tr>;
}

export function Pager({
  path, page, hasNext, filters = {},
}: {
  path: string; page: number; hasNext: boolean; filters?: Record<string, string>;
}) {
  function href(next: number) {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    params.set("page", String(next));
    return `${path}?${params}`;
  }

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-3">
      {page > 1 && <Link className={buttonVariants({ size: "sm" })} href={href(page - 1)}>Previous</Link>}
      <span className="text-small text-ink-2">Page <span className="font-mono">{page}</span></span>
      {hasNext && <Link className={buttonVariants({ size: "sm" })} href={href(page + 1)}>Next</Link>}
    </nav>
  );
}

export function QueueSummary({ queue }: { queue: Awaited<ReturnType<typeof queueHealth>> }) {
  const status = !queue.counts ? "Unavailable" : queue.paused ? "Paused" : queue.workers ? "Running" : "No workers";
  const tone = status === "Running" ? "add" : status === "Unavailable" ? "del" : "query";

  return (
    <Panel>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lead font-semibold capitalize">{queue.name}</h2>
        <Badge tone={tone}>{status}</Badge>
      </header>
      {queue.counts && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(["workers", ...queueStates] as const).map((state) => (
            <div key={state} className="flex justify-between gap-2 border-t border-line pt-2">
              <dt className="text-small text-ink-2 capitalize">{state.replaceAll("-", " ")}</dt>
              <dd className="font-mono tabular-nums">{state === "workers" ? queue.workers : queue.counts?.[state] ?? 0}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
