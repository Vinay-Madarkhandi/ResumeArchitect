import Link from "next/link";
import { Check, CircleAlert, Minus } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { partPoints } from "@/lib/career/score";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { Check as CheckResult, KeywordHit, Score } from "@/lib/schemas/career";
import { cn } from "@/lib/cn";

/** The number seated on its brass rule, then every part that produces it. */
export function ScoreCard({ score, label, context }: { score: Score; label: string; context?: string | null }) {
  return (
    <section aria-label={label} className="rounded-lg border border-line bg-panel p-4">
      <p className="text-small text-ink-2">
        {label}
        {context && <span className="text-ink-3"> · {context}</span>}
      </p>
      <div className="mt-3 inline-flex flex-col items-start">
        <p className="font-mono text-[40px] font-medium leading-none text-ink tabular" aria-label={`${label} ${score.total} of 100`}>
          {score.total}
        </p>
        <span className="mt-1.5 h-0.5 w-full rounded-full bg-brass" aria-hidden />
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {score.parts.map((p) => (
          <li key={p.id}>
            <div className="flex items-baseline justify-between gap-3 text-small">
              <span className="text-ink">{p.label}</span>
              <span className="font-mono text-ink-2 tabular">
                {partPoints(p)}
                <span className="text-ink-3">/{Math.round(p.weight * 100)}</span>
              </span>
            </div>
            <div className="relative mt-1.5 h-1 rounded-full bg-sunken" aria-hidden>
              <span className="absolute inset-y-0 left-0 rounded-full bg-brass" style={{ width: `${p.ratio * 100}%` }} />
            </div>
            <p className="mt-1 text-label text-ink-3">{p.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CheckList({ title, checks }: { title: string; checks: CheckResult[] }) {
  const passed = checks.filter((c) => c.passed).length;
  return (
    <section aria-label={title}>
      <h2 className="flex items-baseline justify-between text-small font-medium text-ink-2">
        {title}
        <span className="font-mono text-label text-ink-3 tabular">
          {passed}/{checks.length}
        </span>
      </h2>
      <ul className="mt-2 flex flex-col rounded-lg border border-line bg-panel px-4">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-2.5 border-t border-line py-2.5 first:border-t-0">
            {c.passed ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-add" aria-label="Passes" />
            ) : (
              <Minus className="mt-0.5 size-3.5 shrink-0 text-del" aria-label="Needs work" />
            )}
            <div className="min-w-0">
              <p className="text-small text-ink">{c.label}</p>
              <p className="text-label text-ink-3">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const KIND_LABEL = { must: "Must-haves", nice: "Nice-to-haves", keyword: "Recruiter keywords" } as const;

/** Found terms in verdigris; missing ones on a dashed border, so the state survives greyscale. */
export function KeywordList({ hits, places }: { hits: KeywordHit[]; places?: Record<string, string> }) {
  const groups = (["must", "nice", "keyword"] as const).map((kind) => ({ kind, items: hits.filter((h) => h.kind === kind) }));
  return (
    <section aria-label="Keyword match" className="flex flex-col gap-4">
      {groups.filter((g) => g.items.length).map((g) => (
        <div key={g.kind}>
          <h2 className="flex items-baseline justify-between text-small font-medium text-ink-2">
            {KIND_LABEL[g.kind]}
            <span className="font-mono text-label text-ink-3 tabular">
              {g.items.filter((h) => h.found).length}/{g.items.length}
            </span>
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {g.items.map((h) => (
              <li
                key={h.term}
                title={h.found && places ? `In ${h.where.map((w) => places[w] ?? w).join(", ")}` : undefined}
                className={cn(
                  "rounded-sm border px-1.5 py-px text-label",
                  h.found ? "border-add/40 text-add" : "border-dashed border-line-strong text-ink-3",
                )}
              >
                <span className="sr-only">{h.found ? "Found: " : "Missing: "}</span>
                {h.term}
                {h.found && places && (
                  <span className="ml-1 text-ink-3">· {h.where.map((w) => places[w] ?? w).join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export interface HistoryItem {
  id: string;
  label: string;
  score: number | null;
  note?: string;
  created_at: string;
}

export function History({ title, items, href }: { title: string; items: HistoryItem[]; href: (id: string) => string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="mb-3 text-small font-medium text-ink-3">
        {title} <span className="font-mono tabular">· {items.length}</span>
      </h2>
      <ul className="overflow-hidden rounded-lg border border-line bg-panel">
        {items.map((item) => (
          <li key={item.id} className="border-t border-line first:border-t-0">
            <Link href={href(item.id)} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-hover">
              <span className="min-w-0 flex-1 truncate text-body text-ink">{item.label}</span>
              {item.note && <span className="hidden text-small text-ink-3 sm:inline">{item.note}</span>}
              <span className="text-small text-ink-3">{formatRelativeTime(item.created_at)}</span>
              <span className="w-8 text-right font-mono text-body text-ink tabular">{item.score ?? "—"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KeyMissing({ what }: { what: string }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-brass/40 bg-brass-soft px-4 py-3 text-body">
      <CircleAlert className="size-4 text-brass" aria-hidden />
      <p className="flex-1 text-ink">Connect a Gemini key to {what}.</p>
      <Link href="/settings" className={buttonVariants({ size: "sm" })}>
        Open settings
      </Link>
    </div>
  );
}

export function PageHeading({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-page font-semibold tracking-[-0.015em]">{title}</h1>
        <p className="mt-1.5 text-body text-ink-2">{intro}</p>
      </div>
      {children}
    </div>
  );
}
