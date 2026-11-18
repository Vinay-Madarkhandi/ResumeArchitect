"use client";

import { useMemo } from "react";
import { highlightPosting } from "@/lib/report/keywords";
import type { MatchReport } from "@/lib/report/report";
import { cn } from "@/lib/cn";

/**
 * The job post with every skill and keyword the score counts marked: solid
 * verdigris when your resume shows it, dashed vermilion when it doesn't.
 * Updates live as the resume changes.
 */
export function JobPostPanel({ text, summary, report }: { text: string | null; summary: string; report: MatchReport }) {
  const skills = useMemo(() => [...report.hardSkills, ...report.softSkills, ...report.otherKeywords], [report]);
  const segments = useMemo(() => (text ? highlightPosting(text, skills) : []), [text, skills]);
  const missing = [...report.hardSkills, ...report.softSkills].filter((s) => s.status === "missing");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-small text-ink-2">{summary}</p>
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
            {missing.map((s) => (
              <li
                key={s.term}
                className="rounded-sm border border-dashed border-del/60 px-1.5 py-px text-label text-ink-2"
                title={`${IMPORTANCE[s.importance]} importance`}
              >
                {s.term}
                {s.importance === "high" && <span className="ml-1 text-del">high</span>}
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
              s.skill ? (
                <mark
                  key={i}
                  title={`${s.skill.term} · ${IMPORTANCE[s.skill.importance].toLowerCase()} importance · ${s.skill.status === "missing" ? "not shown yet" : "in your resume"}`}
                  className={cn(
                    "rounded-[2px] bg-transparent px-0.5 text-ink",
                    s.skill.status === "missing"
                      ? "underline decoration-del decoration-dashed decoration-2 underline-offset-[3px]"
                      : "underline decoration-add decoration-2 underline-offset-[3px]",
                    s.skill.importance === "high" && "font-medium",
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

const IMPORTANCE = { high: "High", medium: "Medium", low: "Low" } as const;
