"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import type { DocumentContent, HighlightRecord } from "@/lib/schemas/document";
import type { ChangeExplanation } from "@/lib/schemas/tailoring";
import { useDebouncedAutosave } from "@/lib/editor/useDebouncedAutosave";
import { usePageCount } from "@/lib/editor/usePageCount";
import { setHighlights as applyHighlightDecorations } from "@/lib/editor/aiHighlightExtension";
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
  // The document tree TipTap emits (via editor.getJSON()) never carries a
  // `highlights` key — it's not part of the ProseMirror schema — so the
  // record of what single Ask-AI edits changed is tracked separately here
  // and merged back in only at save time (see contentToPersist below).
  // Without this, accepting an edit would highlight it live but the record
  // of *that it was AI-changed* would never reach the database, so the
  // highlight silently wouldn't come back after a reload.
  const [savedHighlights, setSavedHighlights] = useState<HighlightRecord[]>(initialDoc.highlights ?? []);
  const [canvasWidth, setCanvasWidth] = useState(720);

  useEffect(() => {
    // Deliberately read after mount rather than in the useState initializer:
    // this component is server-rendered, so seeding state from localStorage
    // during the initial render would desync from the server-rendered HTML
    // and trigger a hydration mismatch. A one-frame width change after
    // mount is the correct tradeoff here.
    try {
      const stored = Number(window.localStorage.getItem("resumeCanvasWidth"));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
      if (stored >= 480 && stored <= 1000) setCanvasWidth(stored);
    } catch {
      // best-effort only
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("resumeCanvasWidth", String(canvasWidth));
    } catch {
      // best-effort only
    }
  }, [canvasWidth]);

  const contentToPersist = useMemo<DocumentContent>(
    () => ({ ...doc, highlights: savedHighlights.length > 0 ? savedHighlights : undefined }),
    [doc, savedHighlights],
  );

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

  const saveStatus = useDebouncedAutosave(contentToPersist, save);
  const pageCount = usePageCount(resumeId, contentToPersist);
  const isTailored = sourceContent !== null;

  const handleHighlightAccepted = useCallback((record: HighlightRecord) => {
    setSavedHighlights((prev) => [...prev, record]);
  }, []);

  // Mark up everything AI has touched — both the bulk tailoring run's
  // changes and any single Ask-AI edits from a previous session — once,
  // right when the editor is ready. These are client-side-only decorations
  // (see lib/editor/aiHighlightExtension.ts), never part of the saved
  // document, so they're simply not there in an exported PDF rather than
  // needing to be stripped out before export.
  const highlightsApplied = useRef(false);
  useEffect(() => {
    if (!editor || highlightsApplied.current) return;
    const fromChanges = (changes ?? [])
      .filter((c) => c.quote)
      .map((c) => ({ quote: c.quote as string, tone: c.kind === "flagged" ? ("flagged" as const) : ("change" as const), title: c.why }));
    const all = [...fromChanges, ...savedHighlights];
    if (all.length === 0) return;
    highlightsApplied.current = true;
    applyHighlightDecorations(editor, all);
  }, [editor, changes, savedHighlights]);

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
          <div className="hidden items-center gap-1.5 md:flex">
            <Icon name="resize-width" size={14} className="text-on-surface-variant" />
            <input
              type="range"
              min={480}
              max={1000}
              step={20}
              value={canvasWidth}
              onChange={(e) => setCanvasWidth(Number(e.target.value))}
              className="doc-width-slider w-24"
              aria-label="Resume canvas width"
              title={`Canvas width: ${canvasWidth}px`}
            />
          </div>
          {pageCount !== null && (
            <span
              className="font-mono text-label-sm text-on-surface-variant"
              title="Estimated length of the exported PDF"
            >
              {pageCount} {pageCount === 1 ? "page" : "pages"}
            </span>
          )}
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

        <main className="w-full overflow-y-auto p-lg md:p-xl">
          <DocumentCanvas initialContent={initialDoc} onChange={setDoc} onReady={setEditor} widthPx={canvasWidth} />
          {editor && <AskAiBubbleMenu editor={editor} resumeId={resumeId} onAccepted={handleHighlightAccepted} />}
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
