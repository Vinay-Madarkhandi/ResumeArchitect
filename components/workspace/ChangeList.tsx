"use client";

import { useEffect, useRef } from "react";
import { Check, CircleHelp, RotateCcw, UserRound } from "lucide-react";
import { Slug } from "@/components/workspace/Redline";
import type { ChangeImpact } from "@/lib/resume/impact";
import type { Hunk } from "@/lib/resume/diff";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { TailoredChange } from "@/lib/schemas/tailoring";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { hasUnverifiedClaim } from "@/lib/grounding/placeholder";
import { cn } from "@/lib/cn";

export interface ChangeEntry {
  hunk: Hunk;
  change: TailoredChange | null;
  impact: ChangeImpact | null;
}

const KIND_LABEL: Record<Hunk["kind"], string> = { modified: "Rewritten", added: "Added", removed: "Removed" };

/**
 * One card per change, in page order. Unreviewed changes keep a brass mark
 * until kept or reverted; flagged ones carry the blue-pencil query.
 */
export function ChangeList({
  entries,
  job,
  reviewed,
  focusedId,
  onFocus,
  onKeep,
  onRevert,
}: {
  entries: ChangeEntry[];
  job: JobAnalysis | null;
  reviewed: Set<string>;
  focusedId: string | null;
  onFocus: (id: string) => void;
  onKeep: (id: string) => void;
  onRevert: (hunk: Hunk) => void;
}) {
  const refs = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    if (focusedId) refs.current.get(focusedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedId]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-line px-4 py-6 text-center">
        <p className="text-body font-medium text-ink">No differences from the original</p>
        <p className="mt-1 text-small text-ink-3">Everything matches the resume you started from.</p>
      </div>
    );
  }

  const reqLabel = (id: string) => job?.requirements.find((r) => r.id === id)?.label;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const { hunk, change, impact } = entry;
        const isReviewed = reviewed.has(hunk.id);
        const focused = focusedId === hunk.id;
        const flags = change?.flags ?? [];
        const needsReview = hunk.after.some((line) => hasUnverifiedClaim(line.text));
        return (
          <li
            key={hunk.id}
            ref={(el) => {
              if (el) refs.current.set(hunk.id, el);
              else refs.current.delete(hunk.id);
            }}
            className={cn(
              "relative rounded-lg border bg-panel transition-[border-color,opacity] duration-200",
              focused ? "border-brass" : "border-line",
              isReviewed && !focused && "opacity-60",
            )}
          >
            <button
              type="button"
              onClick={() => onFocus(hunk.id)}
              className="block w-full px-3.5 pb-2 pt-3 text-left"
              aria-expanded={focused}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {!isReviewed && <span className="size-1.5 rounded-full bg-brass" aria-label="Not reviewed yet" />}
                <span className="text-label font-medium text-ink-2">{KIND_LABEL[hunk.kind]}</span>
                {!change && (
                  <>
                    <span className="text-label text-ink-3">·</span>
                    <span className="inline-flex items-center gap-1 text-label text-ink-3">
                      <UserRound className="size-3" aria-hidden /> Your edit
                    </span>
                  </>
                )}
                {impact && impact.points !== 0 && (
                  <span
                    className={cn("font-mono text-label tabular", impact.points > 0 ? "text-add" : "text-del")}
                    title="Points this change adds to the match score"
                  >
                    {impact.points > 0 ? `+${impact.points}` : impact.points} pts
                  </span>
                )}
                {flags.length > 0 && (
                  <Badge tone="query" className="ml-auto">
                    <CircleHelp aria-hidden /> Verify
                  </Badge>
                )}
                {isReviewed && flags.length === 0 && (
                  <Badge className="ml-auto">
                    <Check aria-hidden /> Kept
                  </Badge>
                )}
              </div>
              <div className="slug-card mt-1.5 text-small leading-relaxed text-ink">
                <Slug hunk={hunk} clamp={!focused} />
              </div>
            </button>

            {focused && (
              <div className="slug-in flex flex-col gap-3 border-t border-line px-3.5 py-3">
                {change?.reason && <p className="text-small text-ink-2">{change.reason}</p>}
                {impact && (impact.gained.length > 0 || impact.lost.length > 0) && (
                  <p className="text-label text-ink-3">
                    {impact.gained.length > 0 && <>Now shows {impact.gained.join(", ")}. </>}
                    {impact.lost.length > 0 && <span className="text-del">No longer shows {impact.lost.join(", ")}.</span>}
                  </p>
                )}
                {change && flags.length === 0 && hunk.before.length > 0 && (
                  <p className="text-label text-ink-3">Rewritten from your original line; nothing new was added.</p>
                )}
                {change && change.requirementIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {change.requirementIds.map((id) => reqLabel(id)).filter(Boolean).map((label) => (
                      <Badge key={label} tone="brass">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
                {flags.map((f) => (
                  <p key={f.value} className="flex gap-2 rounded-md bg-query-soft px-2.5 py-2 text-small text-ink">
                    <CircleHelp className="mt-0.5 size-3.5 shrink-0 text-query" aria-hidden />
                    {f.message}
                  </p>
                ))}
                <div className="flex gap-2">
                  {!isReviewed && !needsReview && (
                    <Button size="sm" variant="primary" onClick={() => onKeep(hunk.id)}>
                      <Check aria-hidden /> Keep
                    </Button>
                  )}
                  <Button size="sm" onClick={() => onRevert(hunk)}>
                    <RotateCcw aria-hidden /> Revert to original
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
