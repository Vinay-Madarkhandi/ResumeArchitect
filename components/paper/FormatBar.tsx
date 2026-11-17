"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Pilcrow, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";

function Tool({ label, active, onClick, children, disabled }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-35 [&_svg]:size-4",
        active && "bg-raised text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Formatting limited to what the resume schema supports. */
export function FormatBar({ editor, className }: { editor: Editor | null; className?: string }) {
  // useEditorState must be bound to a live editor from its first render.
  if (!editor) return <div className={cn("h-9", className)} />;
  return <Tools editor={editor} className={className} />;
}

function Tools({ editor, className }: { editor: Editor; className?: string }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h1: e.isActive("heading", { level: 1 }),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            p: e.isActive("paragraph"),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            undo: e.can().undo(),
            redo: e.can().redo(),
          }
        : null,
  });
  if (!s) return <div className={cn("h-9", className)} />;
  const c = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label="Formatting" className={cn("flex flex-wrap items-center gap-0.5", className)}>
      <Tool label="Undo" disabled={!s.undo} onClick={() => c().undo().run()}>
        <Undo2 />
      </Tool>
      <Tool label="Redo" disabled={!s.redo} onClick={() => c().redo().run()}>
        <Redo2 />
      </Tool>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      <Tool label="Name (Heading 1)" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>
        <Heading1 />
      </Tool>
      <Tool label="Section (Heading 2)" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </Tool>
      <Tool label="Entry (Heading 3)" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </Tool>
      <Tool label="Paragraph" active={s.p && !s.bullet && !s.ordered} onClick={() => c().setParagraph().run()}>
        <Pilcrow />
      </Tool>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      <Tool label="Bold" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label="Bullet list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
    </div>
  );
}
