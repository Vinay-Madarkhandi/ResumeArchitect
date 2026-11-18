"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { DocumentContentSchema, type DocumentContent } from "@/lib/schemas/document";
import { ChangedLines, PageBreaks, PendingSelection } from "@/lib/editor/extensions";

/**
 * The editable proof page. StarterKit is trimmed to exactly the vocabulary
 * lib/schemas/document.ts accepts, so the editor can never produce a
 * document the AI, PDF, or DOCX pipelines don't understand. Tiptap omits
 * `content` on empty blocks, so output is parsed to restore the schema's default.
 */
export function PaperEditor({
  initialContent,
  onChange,
  onReady,
  ariaLabel = "Resume document",
}: {
  initialContent: DocumentContent;
  onChange: (doc: DocumentContent) => void;
  /** Called with the editor once it exists, and with null when it is destroyed. */
  onReady?: (editor: Editor | null) => void;
  ariaLabel?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
      }),
      Placeholder.configure({ placeholder: "Start with your name, then your sections…" }),
      Link.configure({ openOnClick: false, autolink: true }),
      ChangedLines,
      PendingSelection,
      PageBreaks,
    ],
    editorProps: { attributes: { class: "paper-flow", "aria-label": ariaLabel, role: "textbox", "aria-multiline": "true" } },
    content: initialContent,
    onUpdate: ({ editor }) => onChange(DocumentContentSchema.parse(editor.getJSON())),
  });

  useEffect(() => {
    if (!editor) return;
    onReady?.(editor);
    return () => onReady?.(null);
  }, [editor, onReady]);

  return <EditorContent editor={editor} />;
}
