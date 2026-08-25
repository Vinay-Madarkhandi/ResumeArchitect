"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { AiHighlight } from "@/lib/editor/aiHighlightExtension";
import { PageBreak } from "@/lib/editor/pageBreakExtension";
import type { DocumentContent } from "@/lib/schemas/document";

/**
 * The live, WYSIWYG resume canvas — this IS the resume, not a form feeding a
 * separate renderer. Styled (see .resume-doc-canvas in app/globals.css) to
 * visually match the exported PDF (same fonts/colors as lib/pdf/tokens.ts),
 * so there's no need for a separate live PDF preview during editing.
 *
 * The StarterKit extension list below is deliberately trimmed to exactly
 * the node/mark vocabulary lib/schemas/document.ts validates — anything not
 * explicitly enabled here (code blocks, blockquotes, strikethrough, rules)
 * is turned off so the editor can never produce a document the rest of the
 * pipeline (Markdown serialization, PDF export) doesn't know how to handle.
 */
export function DocumentCanvas({
  initialContent,
  onChange,
  onReady,
  editable = true,
  variant = "full",
  widthPx = 720,
}: {
  initialContent: DocumentContent;
  onChange?: (doc: DocumentContent) => void;
  onReady?: (editor: Editor) => void;
  editable?: boolean;
  /** "compact" is for the narrow read-only comparison sidebar
   * (OriginalComparisonPanel) — full document width doesn't fit a 280px
   * column, so this uses a smaller max-width and font scale instead of a
   * CSS transform (which would shrink visually but keep its full-width
   * layout footprint). */
  variant?: "full" | "compact";
  /** User-adjustable canvas width in px (see the width slider in
   * ResumeEditorClient) — ignored for the "compact" variant, which is
   * always sized to its sidebar column. */
  widthPx?: number;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Placeholder.configure({ placeholder: "Start typing your resume…" }),
      Link.configure({ openOnClick: false, autolink: false }),
      AiHighlight,
      PageBreak,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as DocumentContent);
    },
  });

  // Editable state can change after mount (e.g. a read-only comparison
  // instance); TipTap doesn't pick that up from the initial config alone.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) onReady?.(editor);
  }, [editor, onReady]);

  if (variant === "compact") {
    return (
      <div className="w-full bg-surface-container-lowest p-sm">
        <EditorContent editor={editor} className="resume-doc-canvas resume-doc-canvas--compact font-doc text-on-surface" />
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full bg-surface-container-lowest px-margin-desktop py-xl shadow-[var(--shadow-soft)] transition-[max-width] duration-150"
      style={{ maxWidth: widthPx }}
    >
      <EditorContent editor={editor} className="resume-doc-canvas font-doc text-on-surface" />
    </div>
  );
}
