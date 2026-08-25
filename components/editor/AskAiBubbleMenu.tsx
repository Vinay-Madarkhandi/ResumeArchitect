"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Icon } from "@/components/icon/Icon";
import { Button } from "@/components/ui/Button";
import { addHighlight, clearPendingSelection, setPendingSelection } from "@/lib/editor/aiHighlightExtension";
import type { HighlightRecord } from "@/lib/schemas/document";

interface CapturedSelection {
  from: number;
  to: number;
  text: string;
}

interface PreviewResult {
  replacementText: string;
  flagged: boolean;
  flagReason: string | null;
}

const CONTEXT_CHARS = 300;

/** Select any text in the document canvas, tell it what to change, review a
 * preview, then accept or reject — never applied silently. Works on any
 * resume being edited, master or tailored.
 *
 * Two things make a custom interactive TipTap bubble menu tricky, both
 * fixed here:
 *
 * 1. Focusing our own <input> blurs the ProseMirror editor, and the
 *    browser's native text-selection paint disappears the moment focus
 *    leaves the contenteditable — even though nothing about the captured
 *    range actually changed. `shouldShow` returning true whenever we've
 *    already captured a selection keeps the menu itself open through that;
 *    setPendingSelection (lib/editor/aiHighlightExtension.ts) additionally
 *    paints the captured range with its own decoration, independent of DOM
 *    focus, so it stays visibly highlighted the whole time the input is
 *    open — not just up to the moment you click into it.
 * 2. Capturing used to happen once in the bubble menu's own onShow and
 *    then never again — so re-selecting different text while the
 *    instruction box was still open (without explicitly cancelling first)
 *    left `captured` silently pointing at the *original* range. Typing a
 *    new instruction and asking then edited text the user could no longer
 *    even see was selected. Capturing now instead follows the editor's own
 *    selectionUpdate event (real ProseMirror transactions only — clicking
 *    into our <input> never fires one), so any new in-document selection
 *    while idle replaces the old capture; it's locked only while a request
 *    is in flight or a preview is up for review. */
export function AskAiBubbleMenu({
  editor,
  resumeId,
  onAccepted,
}: {
  editor: Editor;
  resumeId: string;
  /** Called with the persistable record of an accepted edit, so the caller
   * can save it alongside the document — otherwise this edit's highlight
   * would vanish the next time the resume is opened (see
   * lib/schemas/document.ts's HighlightRecordSchema doc comment). */
  onAccepted?: (record: HighlightRecord) => void;
}) {
  const [captured, setCaptured] = useState<CapturedSelection | null>(null);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "preview" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  // Track the live document selection as the source of truth for what
  // "captured" means — locked only while a request is in flight or its
  // result is up for review, so a stray click can't yank the range out
  // from under an active ask, but a genuinely new selection made while
  // idle (or after an error) always takes over from the old one.
  useEffect(() => {
    function handleSelectionUpdate() {
      if (status === "loading" || status === "preview") return;
      const { from, to } = editor.state.selection;
      if (from === to) return;
      const text = editor.state.doc.textBetween(from, to, " ");
      if (!text.trim()) return;
      setCaptured((prev) => (prev && prev.from === from && prev.to === to ? prev : { from, to, text }));
    }
    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, status]);

  // The captured range stays visibly marked for as long as it's captured —
  // via a decoration, not the browser's native selection paint, since that
  // disappears the instant focus moves to our own <input> below.
  useEffect(() => {
    if (captured) {
      setPendingSelection(editor, captured.from, captured.to);
    } else {
      clearPendingSelection(editor);
    }
  }, [editor, captured]);

  function close() {
    setCaptured(null);
    setInstruction("");
    setStatus("idle");
    setError(null);
    setPreview(null);
  }

  async function handleAsk() {
    if (!captured || !instruction.trim()) return;
    setStatus("loading");
    setError(null);

    const docSize = editor.state.doc.content.size;
    const contextBefore = editor.state.doc.textBetween(Math.max(0, captured.from - CONTEXT_CHARS), captured.from, " ");
    const contextAfter = editor.state.doc.textBetween(captured.to, Math.min(docSize, captured.to + CONTEXT_CHARS), " ");

    try {
      const res = await fetch(`/api/resumes/${resumeId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText: captured.text, contextBefore, contextAfter, instruction }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setPreview({ replacementText: body.replacementText, flagged: body.flagged, flagReason: body.flagReason ?? null });
      setStatus("preview");
    } catch {
      setError("Network error — please try again.");
      setStatus("error");
    }
  }

  function accept() {
    if (!captured || !preview) return;
    editor.chain().focus().insertContentAt({ from: captured.from, to: captured.to }, preview.replacementText).run();
    // Cursor lands right after the inserted content once the chain runs;
    // walking back by the replacement's length gives the range actually
    // just inserted, so it can be highlighted the same way a bulk
    // tailoring change is (see lib/editor/aiHighlightExtension.ts).
    const to = editor.state.selection.from;
    const from = Math.max(0, to - preview.replacementText.length);
    const tone = preview.flagged ? "flagged" : "change";
    addHighlight(editor, from, to, tone, preview.flagReason ?? undefined);
    onAccepted?.({ quote: preview.replacementText, tone, title: preview.flagReason ?? undefined });
    close();
  }

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={0}
      shouldShow={({ editor: ed, from, to }) => {
        if (captured) return true;
        return from !== to && ed.isEditable && ed.state.doc.textBetween(from, to).trim().length > 0;
      }}
    >
      <div className="w-72 rounded-lg border border-outline-variant bg-surface-container-lowest p-sm shadow-crisp">
        {status === "preview" && preview ? (
          <div className="space-y-sm">
            {preview.flagged && (
              <p className="flex items-start gap-1.5 font-sans text-xs text-error">
                <Icon name="warning" size={12} className="mt-0.5 shrink-0" />
                {preview.flagReason ?? "Please double-check this."}
              </p>
            )}
            <p className="font-doc text-sm text-on-surface-variant line-through opacity-60">{captured?.text}</p>
            <p className="font-doc text-sm text-on-surface">{preview.replacementText}</p>
            <div className="flex justify-end gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                Reject
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={accept}>
                Accept
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-sm">
            <input
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
                if (e.key === "Escape") close();
              }}
              placeholder="Tell AI what to change…"
              disabled={status === "loading"}
              className="w-full rounded border border-outline-variant bg-surface px-2 py-1.5 font-sans text-sm text-on-surface focus:border-secondary focus:outline-none"
            />
            {error && <p className="font-sans text-xs text-error">{error}</p>}
            <div className="flex justify-end gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAsk}
                disabled={status === "loading" || !instruction.trim()}
              >
                {status === "loading" ? "Thinking…" : "Ask AI"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
