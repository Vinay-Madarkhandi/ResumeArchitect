"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ResumeContent } from "@/lib/schemas/resume";
import { finalizeMasterResume } from "@/app/actions/onboarding";
import { ResumeContentEditor } from "@/components/editor/ResumeContentEditor";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";

export function ReviewForm({
  resumeId,
  initialContent,
  lowConfidenceFields,
  isReplacement,
}: {
  resumeId: string;
  initialContent: ResumeContent;
  lowConfidenceFields: string[];
  isReplacement: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await finalizeMasterResume(resumeId, content);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(isReplacement ? "/library" : "/onboarding/connect-gemini");
    router.refresh();
  }

  return (
    <div>
      {lowConfidenceFields.length > 0 && (
        <div className="mb-lg flex items-start gap-2 rounded-lg border border-secondary bg-secondary-container/15 p-md">
          <Icon name="ai-suggestion" size={18} className="mt-0.5 shrink-0 text-secondary" />
          <p className="font-sans text-body-lg text-on-surface">
            We couldn&rsquo;t confidently read a few fields — they&rsquo;re highlighted below. Take a look and fix
            anything that&rsquo;s off.
          </p>
        </div>
      )}

      <ResumeContentEditor value={content} onChange={setContent} lowConfidenceFields={lowConfidenceFields} />

      {error && <p className="mt-md font-sans text-body-lg text-error">{error}</p>}

      <div className="mt-xl flex items-center justify-between border-t border-outline-variant pt-lg">
        <Link
          href={`/onboarding/upload?resumeId=${resumeId}`}
          className="font-sans text-body-lg text-on-surface-variant hover:text-primary"
        >
          Upload a different file
        </Link>
        <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isReplacement ? "Save as master resume" : "Save & continue"}
        </Button>
      </div>
    </div>
  );
}
