"use client";

import { useMemo } from "react";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { requirementEvidence } from "@/lib/tailoring/requirements";
import { highlightJob } from "@/lib/scoring/highlightJob";
import { cn } from "@/lib/cn";

/**
 * The job post with every requirement and keyword marked: solid verdigris
 * when your resume shows it, dashed vermilion when it doesn't. Updates live
 * as the resume changes.
 */
export function JobPostPanel({ text, job, report }: { text: string | null; job: JobAnalysis; report: ReturnType<typeof requirementEvidence> }) {
  const segments = useMemo(() => (text ? highlightJob(text, job, report) : []), [text, job, report]);
  const missing = report.requirements.filter((r) => !r.matched);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-small text-ink-2">{job.summary}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-label text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-add" aria-hidden /> In your resume
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-del" aria-hidden /> Not shown yet
          </span>
        </div>
      </div>

      {missing.length > 0 && (
        <div>
          <h3 className="text-small font-medium text-ink-2">Not shown in your resume</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((r) => (
              <li
                key={r.id}
                className="rounded-sm border border-dashed border-del/60 px-1.5 py-px text-label text-ink-2"
                title={r.importance === "must" ? "Must-have" : "Nice-to-have"}
              >
                {r.label}
                {r.importance === "must" && <span className="ml-1 text-del">must</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-label text-ink-3">Add one only if it&rsquo;s true: use &ldquo;I have this&rdquo; in the score tab, or edit the page.</p>
        </div>
      )}

      {text ? (
        <div>
          <h3 className="text-small font-medium text-ink-2">The posting</h3>
          <div className="mt-2 max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-sunken p-3 text-small leading-relaxed text-ink-2">
            {segments.map((s, i) =>
              s.term ? (
                <mark
                  key={i}
                  title={`${s.term.label} · ${s.term.kind === "keyword" ? "keyword" : s.term.kind === "must" ? "must-have" : "nice-to-have"} · ${s.term.matched ? "in your resume" : "not shown yet"}`}
                  className={cn(
                    "rounded-[2px] bg-transparent px-0.5 text-ink",
                    s.term.matched
                      ? "underline decoration-add decoration-2 underline-offset-[3px]"
                      : "underline decoration-del decoration-dashed decoration-2 underline-offset-[3px]",
                    s.term.kind === "must" && "font-medium",
                  )}
                >
                  {s.text}
                </mark>
              ) : (
                <span key={i}>{s.text}</span>
              ),
            )}
          </div>
        </div>
      ) : (
        <p className="text-small text-ink-3">The original posting text isn&rsquo;t available for this application.</p>
      )}
    </div>
  );
}
