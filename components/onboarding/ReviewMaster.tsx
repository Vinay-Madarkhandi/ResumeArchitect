"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, LayoutTemplate } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { Paper } from "@/components/paper/Paper";
import { PaperEditor } from "@/components/paper/PaperEditor";
import { FormatBar } from "@/components/paper/FormatBar";
import { TemplateGallery } from "@/components/paper/TemplateGallery";
import { finalizeMasterResume } from "@/app/actions/onboarding";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/resume/templates";
import type { DocumentContent } from "@/lib/schemas/document";
import { cn } from "@/lib/cn";

export function ReviewMaster({
  resumeId,
  initialTitle,
  initialContent,
  initialTemplate = "classic",
  usedAi,
}: {
  resumeId: string;
  initialTitle: string;
  initialContent: DocumentContent;
  initialTemplate?: TemplateId;
  usedAi: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [doc, setDoc] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [template, setTemplate] = useState<TemplateId>(initialTemplate);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    const result = await finalizeMasterResume(resumeId, doc, title, template);
    if (!result.ok) {
      setPending(false);
      return toast(result.error, "error");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <div className="sticky top-0 z-10 -mx-1 mb-4 bg-ground/90 px-1 py-2 backdrop-blur">
          <FormatBar
            editor={editor}
            template={template}
            onTemplateChange={setTemplate}
            onOpenGallery={() => setGalleryOpen(true)}
          />
        </div>
        <Paper template={template}>
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

        {/* Template Selector Section */}
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-small font-semibold text-ink">Design Template</span>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="flex items-center gap-1 text-label font-medium text-brass hover:underline cursor-pointer"
            >
              <LayoutTemplate className="size-3.5" /> Full gallery
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {TEMPLATE_LIST.map((t) => {
              const isSelected = t.id === template;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    "flex items-center justify-between rounded-md border p-2 text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-brass bg-brass/10 ring-1 ring-brass"
                      : "border-line bg-panel/50 hover:border-line-strong hover:bg-hover",
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-small font-medium text-ink">{t.label}</span>
                      <span className="rounded bg-line/80 px-1.5 py-0.2 text-[10px] font-mono text-ink-3 uppercase">
                        {t.body}
                      </span>
                      {t.id === initialTemplate && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-medium text-emerald-500">
                          Detected
                        </span>
                      )}
                    </div>
                    <p className="truncate text-label text-ink-3 mt-0.5">{t.description}</p>
                  </div>
                  {isSelected && <Check className="size-4 shrink-0 text-brass" />}
                </button>
              );
            })}
          </div>
        </div>

        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent
            title="Resume Templates"
            description="Every template is ATS-safe: one single column with standard headings. Choosing one changes only the layout, preserving all your words."
            className="max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto"
          >
            <TemplateGallery
              doc={doc}
              value={template}
              onChange={(t) => {
                setTemplate(t);
                setGalleryOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

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
