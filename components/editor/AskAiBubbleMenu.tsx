"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Icon } from "@/components/icon/Icon";
import { Button } from "@/components/ui/Button";
import { addHighlight } from "@/lib/editor/aiHighlightExtension";
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
 * The tricky part of a custom interactive TipTap bubble menu: focusing our
 * own <input> blurs the ProseMirror editor, and the plugin's default
 * behavior is to hide on blur. `shouldShow` returning true whenever we've
 * already captured a selection keeps the menu open through that, instead
 * of it vanishing the instant you click into the instruction field. */
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
      options={{
        onShow: () => {
          if (captured) return;
          const { from, to } = editor.state.selection;
          if (from === to) return;
          setCaptured({ from, to, text: editor.state.doc.textBetween(from, to, " ") });
        },
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
