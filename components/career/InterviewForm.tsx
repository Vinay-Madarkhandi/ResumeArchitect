"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
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
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5 rounded-lg border border-line bg-panel p-5">
      <TargetPicker kinds={KINDS} applications={applications} hasKey={hasKey} value={target} onChange={setTarget} />
      {error && (
        <p role="alert" className="flex gap-2 text-small text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={busy} disabled={!hasKey}>
          {busy ? "Writing questions…" : "Write questions"}
        </Button>
        <p className="text-small text-ink-3">
          Uses the application&rsquo;s tailored resume, or your master resume for a pasted post or role.
        </p>
      </div>
    </form>
  );
}
