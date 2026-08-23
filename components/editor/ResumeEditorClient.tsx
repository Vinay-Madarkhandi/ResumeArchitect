"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import type { DocumentContent } from "@/lib/schemas/document";
import type { ChangeExplanation } from "@/lib/schemas/tailoring";
import { useDebouncedAutosave } from "@/lib/editor/useDebouncedAutosave";
import { DocumentCanvas } from "@/components/editor/DocumentCanvas";
import { AskAiBubbleMenu } from "@/components/editor/AskAiBubbleMenu";
import { OriginalComparisonPanel } from "@/components/editor/OriginalComparisonPanel";
import { ChangeExplanationsPanel } from "@/components/editor/ChangeExplanationsPanel";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icon/Icon";
import { cn } from "@/lib/cn";

export function ResumeEditorClient({
  resumeId,
  title,
  isDefault,
  initialDoc,
  sourceContent,
  jobTitleSnapshot,
  jobCompanySnapshot,
  changes,
}: {
  resumeId: string;
  title: string;
  isDefault: boolean;
  initialDoc: DocumentContent;
  sourceContent: DocumentContent | null;
  jobTitleSnapshot: string | null;
  jobCompanySnapshot: string | null;
  changes: ChangeExplanation[] | null;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [doc, setDoc] = useState<DocumentContent>(initialDoc);

  const save = useCallback(
    async (value: DocumentContent) => {
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      if (!res.ok) throw new Error("save failed");
    },
    [resumeId],
  );

  const saveStatus = useDebouncedAutosave(doc, save);
  const isTailored = sourceContent !== null;

  const { canUndo, canRedo } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canUndo: Boolean(editor?.can().undo()),
      canRedo: Boolean(editor?.can().redo()),
    }),
  }) ?? { canUndo: false, canRedo: false };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-lg">
        <div className="flex min-w-0 items-center gap-sm">
          <Link href="/library" className="text-on-surface-variant hover:text-primary">
            <Icon name="arrow-left" size={18} />
          </Link>
          <h1 className="truncate font-sans text-headline-md text-on-surface">
            {jobTitleSnapshot && jobCompanySnapshot ? `${jobTitleSnapshot} — ${jobCompanySnapshot}` : title}
          </h1>
          <Badge variant={isDefault ? "accent" : "outline"}>{isDefault ? "Master" : "Tailored"}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-md">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!canUndo}
              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
              aria-label="Undo"
            >
              <Icon name="undo" size={16} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!canRedo}
              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
              aria-label="Redo"
            >
              <Icon name="redo" size={16} />
            </button>
          </div>
          <SaveStatusLabel status={saveStatus} />
          <Link
            href={`/resumes/${resumeId}/export`}
            className="inline-flex h-9 items-center gap-1.5 rounded bg-secondary px-md font-sans text-button text-on-secondary hover:bg-on-secondary-container"
          >
            <Icon name="download" size={16} />
            Export
          </Link>
        </div>
      </header>

      <div
        className={cn(
          "flex-1 overflow-hidden bg-background",
          isTailored ? "grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]" : "flex justify-center",
        )}
      >
        {isTailored && (
          <aside className="hidden overflow-y-auto border-r border-outline-variant bg-surface-container-low p-md lg:block">
            <div className="sticky top-0 mb-md flex items-center gap-2 border-b border-outline-variant bg-surface-container-low pb-sm">
              <Icon name="history" size={16} className="text-outline" />
              <h2 className="font-sans text-headline-md text-sm text-on-surface-variant">Original resume</h2>
            </div>
            {sourceContent && <OriginalComparisonPanel content={sourceContent} />}
          </aside>
        )}

        <main className="overflow-y-auto p-lg md:p-xl">
          <DocumentCanvas initialContent={initialDoc} onChange={setDoc} onReady={setEditor} />
          {editor && <AskAiBubbleMenu editor={editor} resumeId={resumeId} />}
        </main>

        {isTailored && (
          <aside className="hidden overflow-y-auto border-l border-outline-variant bg-surface-container-low p-md lg:block">
            <div className="sticky top-0 mb-md flex items-center gap-2 border-b border-outline-variant bg-surface-container-low pb-sm">
              <Icon name="ai-suggestion" size={16} className="text-secondary" />
              <h2 className="font-sans text-headline-md text-sm text-on-surface">What changed</h2>
            </div>
            <ChangeExplanationsPanel changes={changes ?? []} />
          </aside>
        )}
      </div>
    </div>
  );
}

function SaveStatusLabel({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving") {
    return <span className="font-mono text-label-sm text-on-surface-variant">Saving…</span>;
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 font-mono text-label-sm text-secondary">
        <Icon name="check" size={12} />
        Saved
      </span>
    );
  }
  if (status === "error") {
    return <span className="font-mono text-label-sm text-error">Couldn&rsquo;t save</span>;
  }
  return null;
}
