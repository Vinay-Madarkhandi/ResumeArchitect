"use client";

import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { PipelineStage } from "@/lib/schemas/tailoring";
import { cn } from "@/lib/cn";

export const STAGE_COPY: Record<PipelineStage, { title: string; doing: string }> = {
  copy: { title: "Read the job", doing: "Pulling out what the hiring manager will screen for" },
  markup: { title: "Measure your resume", doing: "Checking which requirements your resume already shows" },
  set: { title: "Rewrite lines", doing: "Rewording your real experience toward this role" },
  proof: { title: "Proof every change", doing: "Flagging any number, name, or skill your original doesn't back up" },
  lockup: { title: "Score and save", doing: "Measuring the result against the same requirements" },
};

export const STAGES: PipelineStage[] = ["copy", "markup", "set", "proof", "lockup"];

export interface StageState {
  status: "waiting" | "running" | "done" | "failed";
  note?: string;
}

/** The composing stick: five slugs set in order, each holding its result once done. */
export function Pipeline({ stages }: { stages: Record<PipelineStage, StageState> }) {
  return (
    <ol className="flex flex-col" aria-label="Tailoring progress">
      {STAGES.map((stage, i) => {
        const s = stages[stage];
        return (
          <li key={stage} className="relative flex gap-4 pb-6 last:pb-0" aria-current={s.status === "running" ? "step" : undefined}>
            {i < STAGES.length - 1 && (
              <span
                className={cn("absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px", s.status === "done" ? "bg-brass" : "bg-line-strong")}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
                s.status === "done" && "border-brass bg-brass text-on-brass",
                s.status === "running" && "border-brass text-brass",
                s.status === "waiting" && "border-line-strong text-ink-3",
                s.status === "failed" && "border-danger text-danger",
              )}
            >
              {s.status === "done" ? (
                <Check className="size-3.5" aria-hidden />
              ) : s.status === "running" ? (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              ) : s.status === "failed" ? (
                <CircleAlert className="size-3.5" aria-hidden />
              ) : (
                <span className="font-mono text-[11px] tabular">{i + 1}</span>
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn("text-body font-medium", s.status === "waiting" ? "text-ink-3" : "text-ink")}>{STAGE_COPY[stage].title}</p>
              {s.status === "running" && (
                <>
                  <p className="mt-0.5 text-small text-ink-2">{STAGE_COPY[stage].doing}…</p>
                  <div className="working-rule mt-2 h-px w-full max-w-64" aria-hidden />
                </>
              )}
              {s.status === "done" && s.note && <p className="slug-in mt-0.5 text-small text-ink-2 tabular">{s.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
