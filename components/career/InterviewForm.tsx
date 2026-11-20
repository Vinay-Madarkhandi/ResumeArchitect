"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { initialTarget, TargetPicker, toTargetInput, type ApplicationOption, type TargetKind } from "./TargetPicker";
import { useCareerPost } from "./useCareerPost";

const KINDS: TargetKind[] = ["application", "posting", "role"];

export function InterviewForm({ applications, hasKey }: { applications: ApplicationOption[]; hasKey: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState(() => initialTarget(KINDS, applications));
  const { post, busy, error } = useCareerPost<{ id: string }>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const data = await post("/api/career/interview", { target: toTargetInput(target) });
    if (data) router.push(`/interview/${data.id}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex max-w-2xl flex-col gap-6 rounded-xl border border-line bg-panel/75 p-6 shadow-xs backdrop-blur-xs"
    >
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brass/10 text-brass">
          <HelpCircle className="size-5" />
        </div>
        <div>
          <h2 className="text-lead font-semibold text-ink">Interview Preparation Session</h2>
          <p className="text-small text-ink-3">
            Generates behavioral, role-specific, and technical questions with rubrics.
          </p>
        </div>
      </div>

      <TargetPicker kinds={KINDS} applications={applications} hasKey={hasKey} value={target} onChange={setTarget} />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-danger/40 bg-del-soft p-3.5 text-small text-danger"
        >
          <CircleAlert className="size-4 shrink-0 text-danger" aria-hidden />
          <p className="flex-1">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <p className="max-w-md text-small text-ink-3">
          Uses the application’s tailored resume, or your master resume for a pasted post or role.
        </p>
        <Button type="submit" variant="primary" loading={busy} disabled={!hasKey} className="gap-2">
          <span>{busy ? "Generating questions…" : "Generate questions"}</span>
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
