"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Paper } from "@/components/paper/Paper";
import { PaperEditor } from "@/components/paper/PaperEditor";
import { FormatBar } from "@/components/paper/FormatBar";
import { finalizeMasterResume } from "@/app/actions/onboarding";
import type { DocumentContent } from "@/lib/schemas/document";

export function ReviewMaster({
  resumeId,
  initialTitle,
  initialContent,
  usedAi,
}: {
  resumeId: string;
  initialTitle: string;
  initialContent: DocumentContent;
  usedAi: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [doc, setDoc] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    const result = await finalizeMasterResume(resumeId, doc, title);
    if (!result.ok) {
      setPending(false);
      return toast(result.error, "error");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        <div className="sticky top-0 z-10 -mx-1 mb-4 bg-ground/90 px-1 py-2 backdrop-blur">
          <FormatBar editor={editor} />
        </div>
        <Paper template="classic">
          <PaperEditor initialContent={initialContent} onChange={setDoc} onReady={setEditor} />
        </Paper>
      </div>
      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
        <div>
          <h1 className="text-title font-semibold">Check it over</h1>
          <p className="mt-2 text-small text-ink-2">
            {usedAi
              ? "Gemini rebuilt the structure from your file. Fix anything it misread directly on the page."
              : "We pulled the text and sections from your file. Fix anything that came through wrong directly on the page."}
          </p>
        </div>
        <ul className="flex flex-col gap-2 text-small text-ink-2">
          {["Your name is the first, largest line", "Sections use headings (Experience, Skills…)", "Achievements are bullet points"].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-brass" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <label className="flex flex-col gap-1.5 text-small font-medium text-ink-2">
          Name this resume
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <Button variant="primary" size="lg" loading={pending} onClick={confirm}>
          Save as my master resume
        </Button>
        <p className="flex gap-2 text-label text-ink-3">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden /> Next you’ll scan it against a job. You can edit your master anytime from Resumes.
        </p>
      </aside>
    </div>
  );
}
