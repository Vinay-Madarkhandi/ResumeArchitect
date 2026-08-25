"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { validateAts } from "@/lib/ats/validateAts";
import type { DocumentContent } from "@/lib/schemas/document";
import type { MatchAnalysis } from "@/lib/schemas/matchAnalysis";

/** ATS checklist (always available, computed instantly client-side — see
 * lib/ats/validateAts.ts) plus, for a resume tailored to a specific job, an
 * on-demand job-match analysis: a real Gemini call against the user's own
 * key, so it runs only when asked rather than on every keystroke. */
export function MatchAnalysisPanel({
  resumeId,
  doc,
  hasJobDescription,
  open,
  onOpenChange,
}: {
  resumeId: string;
  doc: DocumentContent;
  hasJobDescription: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);

  const atsChecks = validateAts(doc);
  const atsPassed = atsChecks.filter((c) => c.passed).length;

  async function runAnalysis() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/match-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: doc }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setAnalysis(body);
      setStatus("done");
    } catch {
      setError("Network error — please try again.");
      setStatus("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[32rem] overflow-y-auto">
        <DialogTitle>Job match &amp; ATS check</DialogTitle>
        <DialogDescription>
          How this resume reads to an ATS parser{hasJobDescription ? ", and against the job it's tailored for." : "."}
        </DialogDescription>

        <div className="mt-lg space-y-lg">
          <div>
            <div className="mb-sm flex items-center justify-between">
              <h3 className="font-sans text-sm font-semibold text-on-surface">ATS checklist</h3>
              <span className="font-mono text-label-sm text-on-surface-variant">
                {atsPassed}/{atsChecks.length} passed
              </span>
            </div>
            <div className="space-y-1.5">
              {atsChecks.map((check) => (
                <div key={check.id} className="flex gap-2 rounded border border-outline-variant p-sm">
                  <Icon
                    name={check.passed ? "check-circle" : "warning"}
                    size={16}
                    className={check.passed ? "mt-0.5 shrink-0 text-secondary" : "mt-0.5 shrink-0 text-error"}
                  />
                  <div>
                    <p className="font-sans text-sm font-medium text-on-surface">{check.label}</p>
                    <p className="font-sans text-xs text-on-surface-variant">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasJobDescription && (
            <div>
              <h3 className="mb-sm font-sans text-sm font-semibold text-on-surface">Job match</h3>

              {status === "idle" && (
                <Button variant="secondary" size="sm" onClick={runAnalysis}>
                  <Icon name="ai-suggestion" size={14} />
                  Check job match
                </Button>
              )}

              {status === "loading" && (
                <p className="flex items-center gap-1.5 font-sans text-sm text-on-surface-variant">
                  <Icon name="spinner" size={14} className="animate-spin" />
                  Analyzing against the job description…
                </p>
              )}

              {status === "error" && (
                <div className="space-y-sm">
                  <p className="font-sans text-sm text-error">{error}</p>
                  <Button variant="secondary" size="sm" onClick={runAnalysis}>
                    Try again
                  </Button>
                </div>
              )}

              {status === "done" && analysis && (
                <div className="space-y-md">
                  {analysis.matchScore !== null && (
                    <div className="flex items-center gap-md rounded-lg border border-outline-variant p-md">
                      <div className="font-display text-4xl text-secondary">{analysis.matchScore}%</div>
                      <div>
                        <p className="font-mono text-label-sm uppercase text-on-surface-variant">Skill coverage</p>
                        <p className="font-sans text-sm text-on-surface">
                          {analysis.matchedSkills.length} of {analysis.requiredSkills.length} required skills found
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="font-sans text-sm text-on-surface-variant">{analysis.summary}</p>

                  {analysis.missingSkills.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-mono text-label-sm uppercase text-on-surface-variant">Missing from your resume</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.missingSkills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-error/40 bg-error-container/20 px-2.5 py-1 font-sans text-xs text-on-error-container"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.matchedSkills.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-mono text-label-sm uppercase text-on-surface-variant">Covered</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.matchedSkills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-secondary/40 bg-secondary-container/20 px-2.5 py-1 font-sans text-xs text-on-secondary-container"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="ghost" size="sm" onClick={runAnalysis}>
                    <Icon name="retry" size={13} />
                    Re-check
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
