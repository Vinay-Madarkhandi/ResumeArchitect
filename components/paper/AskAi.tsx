"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { CircleAlert, PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PendingKey, setPending } from "@/lib/editor/extensions";

interface Captured {
  from: number;
  to: number;
  text: string;
}

const CONTEXT_CHARS = 300;
const QUICK = ["Make it more concise", "Lead with impact", "Use the job's wording"];

/**
 * Select text on the page, say what to change, preview the rewrite, then
 * keep or discard it. Kept edits show up in the review like any other change.
 * The captured range is painted with a decoration so it stays visible while
 * focus is in the instruction box, and a new selection replaces it unless a
 * request or preview is in progress.
 */
export function AskAi({ editor, resumeId }: { editor: Editor; resumeId: string }) {
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [instruction, setInstruction] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "preview">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ text: string; flagged: boolean; reason: string | null } | null>(null);

  useEffect(() => {
    const onSelect = () => {
      if (state !== "idle") return;
      const { from, to } = editor.state.selection;
      if (from === to) return;
      const text = editor.state.doc.textBetween(from, to, " ");
      if (text.trim()) setCaptured((p) => (p && p.from === from && p.to === to ? p : { from, to, text }));
    };
    editor.on("selectionUpdate", onSelect);
    return () => {
      editor.off("selectionUpdate", onSelect);
    };
  }, [editor, state]);

  useEffect(() => {
    setPending(editor, captured ? { from: captured.from, to: captured.to } : null);
  }, [editor, captured]);

  function close() {
    setCaptured(null);
    setInstruction("");
    setState("idle");
    setError(null);
    setPreview(null);
  }

  async function ask(text = instruction) {
    if (!captured || !text.trim()) return;
    setInstruction(text);
    setState("loading");
    setError(null);
    const size = editor.state.doc.content.size;
    const body = {
      selectedText: captured.text,
      contextBefore: editor.state.doc.textBetween(Math.max(0, captured.from - CONTEXT_CHARS), captured.from, " "),
      contextAfter: editor.state.doc.textBetween(captured.to, Math.min(size, captured.to + CONTEXT_CHARS), " "),
      instruction: text,
    };
    const res = await fetch(`/api/resumes/${resumeId}/ai-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data) {
      setError(data?.error ?? "Couldn't reach the server. Check your connection.");
      setState("idle");
      return;
    }
    setPreview({ text: data.replacementText, flagged: !!data.flagged, reason: data.flagReason ?? null });
    setState("preview");
  }

  function keep() {
    if (!captured || !preview || preview.flagged) return;
    // The pending decoration is mapped through every edit made while waiting,
    // so it marks where the selected text is now, not where it was.
    const [range] = PendingKey.getState(editor.state)?.find() ?? [];
    if (!range) {
      setError("The selected text was edited meanwhile. Select it again.");
      setState("idle");
      setPreview(null);
      return;
    }
    editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, preview.text).run();
    close();
  }

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={0}
      options={{ placement: "bottom-start", offset: 8 }}
      shouldShow={({ editor: ed, from, to }) =>
        !!captured || (from !== to && ed.isEditable && ed.state.doc.textBetween(from, to).trim().length > 0)
      }
    >
      <div className="w-[22rem] rounded-lg border border-line bg-raised p-3 font-sans text-ink shadow-pop" role="dialog" aria-label="Ask AI">
        {state === "preview" && preview ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 rounded-md bg-sunken p-2.5 text-small leading-relaxed">
              <p className="mark-del self-start">{captured?.text}</p>
              <p className="mark-add self-start">{preview.text}</p>
            </div>
            {preview.flagged && (
              <p className="flex items-start gap-1.5 text-small text-query">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {preview.reason ?? "Check this is accurate before keeping it."}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={close}>
                Discard
              </Button>
              <Button size="sm" variant="primary" onClick={keep} disabled={preview.flagged} autoFocus>
                Keep rewrite
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <label className="flex items-center gap-1.5 text-label font-medium text-ink-3" htmlFor="ask-ai-input">
              <PenLine className="size-3.5 text-brass" aria-hidden /> Rewrite the selection
            </label>
            <input
              id="ask-ai-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && close()}
              placeholder="e.g. Emphasize the cost savings"
              disabled={state === "loading"}
              className="h-9 w-full rounded-md border border-line-strong bg-sunken px-3 text-body text-ink placeholder:text-ink-3 focus:border-brass focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={state === "loading"}
                  onClick={() => void ask(q)}
                  className="rounded-sm border border-line px-2 py-0.5 text-label text-ink-2 transition-colors hover:border-brass hover:text-ink disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            {error && <p className="text-small text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" loading={state === "loading"} disabled={!instruction.trim()}>
                Rewrite
              </Button>
            </div>
          </form>
        )}
      </div>
    </BubbleMenu>
  );
}
