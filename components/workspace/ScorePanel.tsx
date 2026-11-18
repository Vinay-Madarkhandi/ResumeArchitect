"use client";

import { Check, Minus, Plus } from "lucide-react";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { Breakdown, CheckList, MatchRateFigure } from "@/components/scan/reportParts";
import type { MatchReport } from "@/lib/report/report";
import type { RequirementEvidence, requirementEvidence } from "@/lib/tailoring/requirements";
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
  evidence,
  originalEvidence,
  onAddSkill,
}: {
  before: MatchReport;
  now: MatchReport;
  evidence: ReturnType<typeof requirementEvidence>;
  originalEvidence: RequirementEvidence[];
  onAddSkill: (label: string) => void;
}) {
  const must = evidence.requirements.filter((r) => r.importance === "must");
  const nice = evidence.requirements.filter((r) => r.importance === "nice");

  return (
    <div className="flex flex-col gap-6">
      <MatchRateFigure rate={now.matchRate} target={now.verdict.target} size="md" />
      <div>
        <h3 className="mb-3 text-small font-medium text-ink-2">Score breakdown</h3>
        <Breakdown components={now.breakdown} baseline={before.breakdown} />
      </div>

      <RequirementGroup title="Must-have requirements" items={must} onAddSkill={onAddSkill} originalEvidence={originalEvidence} />
      {nice.length > 0 && <RequirementGroup title="Nice-to-have requirements" items={nice} onAddSkill={onAddSkill} originalEvidence={originalEvidence} />}

      {evidence.keywords.length > 0 && (
        <div>
          <h3 className="text-small font-medium text-ink-2">Recruiter keywords</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {evidence.keywords.map((k) => (
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

      <details>
        <summary className="cursor-pointer text-small font-medium text-ink-2">ATS readability</summary>
        <div className="mt-2"><CheckList checks={[...now.searchability, ...now.formatting]} /></div>
      </details>
    </div>
  );
}

function RequirementGroup({
  title,
  items,
  onAddSkill,
  originalEvidence,
}: {
  title: string;
  items: RequirementEvidence[];
  onAddSkill: (label: string) => void;
  originalEvidence: RequirementEvidence[];
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
          const wasMatched = originalEvidence.find((b) => b.id === r.id)?.matched;
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
