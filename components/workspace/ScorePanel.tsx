"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { componentPoints, type ScoreReport } from "@/lib/scoring/score";
import { cn } from "@/lib/cn";

/**
 * The score lock-up: before → now in large mono figures, then the exact
 * breakdown that produces the number, then each requirement with the line
 * that satisfies it. Missing requirements can be added only by the user
 * ("I have this"), never by the AI.
 */
export function ScorePanel({
  before,
  now,
  onAddSkill,
}: {
  before: ScoreReport;
  now: ScoreReport;
  onAddSkill: (label: string) => void;
}) {
  const must = now.requirements.filter((r) => r.importance === "must");
  const nice = now.requirements.filter((r) => r.importance === "nice");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="sr-only">Score breakdown</h3>
        <ul className="flex flex-col gap-3">
          {now.components.map((c) => {
            const prev = before.components.find((b) => b.id === c.id);
            return (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-3 text-small">
                  <span className="text-ink">{c.label}</span>
                  <span className="font-mono text-ink-2 tabular">
                    {componentPoints(c)}
                    <span className="text-ink-3">/{Math.round(c.weight * 100)}</span>
                  </span>
                </div>
                <div className="relative mt-1.5 h-1 rounded-full bg-sunken" aria-hidden>
                  {prev && (
                    <span className="absolute inset-y-0 left-0 rounded-full bg-line-strong" style={{ width: `${prev.ratio * 100}%` }} />
                  )}
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-brass transition-[width] duration-300 ease-[var(--ease-out-expo)]"
                    style={{ width: `${c.ratio * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-label text-ink-3">{c.detail}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <RequirementGroup title="Must-haves" items={must} onAddSkill={onAddSkill} beforeReport={before} />
      {nice.length > 0 && <RequirementGroup title="Nice-to-haves" items={nice} onAddSkill={onAddSkill} beforeReport={before} />}

      {now.keywords.length > 0 && (
        <div>
          <h3 className="text-small font-medium text-ink-2">Recruiter keywords</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {now.keywords.map((k) => (
              <li
                key={k.term}
                className={cn(
                  "rounded-sm border px-1.5 py-px text-label",
                  k.matched ? "border-add/40 text-add" : "border-dashed border-line-strong text-ink-3",
                )}
              >
                {!k.matched && <span className="sr-only">Missing: </span>}
                {k.term}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AtsList report={now} />
    </div>
  );
}

function RequirementGroup({
  title,
  items,
  onAddSkill,
  beforeReport,
}: {
  title: string;
  items: ScoreReport["requirements"];
  onAddSkill: (label: string) => void;
  beforeReport: ScoreReport;
}) {
  const matched = items.filter((r) => r.matched).length;
  return (
    <div>
      <h3 className="flex items-baseline justify-between text-small font-medium text-ink-2">
        {title}
        <span className="font-mono text-label text-ink-3 tabular">
          {matched}/{items.length}
        </span>
      </h3>
      <ul className="mt-2 flex flex-col">
        {items.map((r) => {
          const wasMatched = beforeReport.requirements.find((b) => b.id === r.id)?.matched;
          return (
            <li key={r.id} className="group flex items-start gap-2 border-t border-line py-2 first:border-t-0">
              {r.matched ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-add" aria-label="Shown" />
              ) : (
                <Minus className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-label="Not shown" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-small", r.matched ? "text-ink" : "text-ink-2")}>
                  {r.label}
                  {r.matched && !wasMatched && <span className="ml-1.5 text-label text-add">new</span>}
                </p>
                {r.evidence && <p className="mt-0.5 line-clamp-2 text-label text-ink-3">&ldquo;{r.evidence}&rdquo;</p>}
              </div>
              {!r.matched && (
                <button
                  type="button"
                  onClick={() => onAddSkill(r.label)}
                  className="flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-label text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                  title={`Add ${r.label} to your skills. Only if it's true.`}
                >
                  <Plus className="size-3" aria-hidden /> I have this
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Before → now, set like a slug: the old figure struck, the new one seated on a brass rule. */
export function ScoreLockup({ job, before, now }: { job: JobAnalysis; before: number; now: number }) {
  const gain = now - before;
  return (
    <div>
      <p className="line-clamp-2 text-small text-ink-2">
        Match for <span className="text-ink">{job.title}</span>
        {job.company && <span className="text-ink-3"> · {job.company}</span>}
      </p>
      <div className="mt-3 flex items-end gap-4">
        <p className="font-mono text-[26px] leading-none text-ink-3 line-through decoration-del/70 decoration-1 tabular" aria-label={`Original score ${before}`}>
          {before}
        </p>
        <div className="flex flex-col items-start">
          <p className="font-mono text-[40px] font-medium leading-none text-ink tabular" aria-live="polite" aria-label={`Current score ${now}`}>
            {now}
          </p>
          <span className="mt-1.5 h-0.5 w-full rounded-full bg-brass" aria-hidden />
        </div>
        {gain !== 0 && (
          <p className={cn("mb-1 ml-auto font-mono text-small tabular", gain > 0 ? "text-add" : "text-del")}>
            {gain > 0 ? `+${gain}` : gain} pts
          </p>
        )}
      </div>
    </div>
  );
}

export function AtsList({ report }: { report: Pick<ScoreReport, "ats"> }) {
  const [open, setOpen] = useState(false);
  const passed = report.ats.filter((c) => c.passed).length;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between text-small font-medium text-ink-2 hover:text-ink"
      >
        <span className="flex items-center gap-1.5">
          <ChevronDown className={cn("size-3.5 self-center transition-transform", open && "rotate-180")} aria-hidden />
          ATS readability
        </span>
        <span className="font-mono text-label text-ink-3 tabular">
          {passed}/{report.ats.length}
        </span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col">
          {report.ats.map((c) => (
            <li key={c.id} className="flex gap-2 border-t border-line py-2 first:border-t-0">
              {c.passed ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-add" aria-label="Passes" />
              ) : (
                <Minus className="mt-0.5 size-3.5 shrink-0 text-del" aria-label="Fails" />
              )}
              <div>
                <p className="text-small text-ink">{c.label}</p>
                <p className="text-label text-ink-3">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
