import type { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * ProseMirror decorations for the paper editor. All of them are view-only:
 * nothing here is ever saved in the document or exported.
 */

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// ---------------- changed lines ----------------

interface ChangedState {
  original: Set<string> | null;
  set: DecorationSet;
}

export const ChangedLinesKey = new PluginKey<ChangedState>("changedLines");

/** Every heading, paragraph, and list item whose text isn't in the original gets a margin mark. */
function changedDecorations(doc: PMNode, original: Set<string> | null): DecorationSet {
  if (!original) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    const name = node.type.name;
    const isLine = name === "listItem" || name === "heading" || (name === "paragraph" && parent?.type.name !== "listItem");
    if (!isLine) return true;
    const text = norm(node.textContent);
    if (text && !original.has(text)) {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-changed": "true" }));
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

export const ChangedLines = Extension.create({
  name: "changedLines",
  addProseMirrorPlugins() {
    return [
      new Plugin<ChangedState>({
        key: ChangedLinesKey,
        state: {
          init: () => ({ original: null, set: DecorationSet.empty }),
          apply(tr, value, _old, state: EditorState) {
            const meta = tr.getMeta(ChangedLinesKey) as { original: string[] | null } | undefined;
            if (!meta && !tr.docChanged) return value;
            const original = meta ? (meta.original ? new Set(meta.original.map(norm)) : null) : value.original;
            return { original, set: changedDecorations(state.doc, original) };
          },
        },
        props: {
          decorations(state) {
            return ChangedLinesKey.getState(state)?.set;
          },
        },
      }),
    ];
  },
});

/** Sets the original lines to compare against (null turns the marks off). */
export function setOriginalLines(editor: Editor, lines: string[] | null) {
  editor.view.dispatch(editor.state.tr.setMeta(ChangedLinesKey, { original: lines }));
}

// ---------------- pending Ask-AI selection ----------------

export const PendingKey = new PluginKey<DecorationSet>("pendingSelection");

export const PendingSelection = Extension.create({
  name: "pendingSelection",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: PendingKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(PendingKey) as { from: number; to: number } | null | undefined;
            if (meta === null) return DecorationSet.empty;
            if (meta) return DecorationSet.create(tr.doc, [Decoration.inline(meta.from, meta.to, { class: "ai-pending" })]);
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return PendingKey.getState(state);
          },
        },
      }),
    ];
  },
});

export function setPending(editor: Editor, range: { from: number; to: number } | null) {
  editor.view.dispatch(editor.state.tr.setMeta(PendingKey, range));
}

// ---------------- page breaks ----------------

export const PageBreakKey = new PluginKey<DecorationSet>("pageBreak");

export const PageBreaks = Extension.create({
  name: "pageBreaks",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: PageBreakKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(PageBreakKey) as DecorationSet | undefined;
            return meta ?? old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return PageBreakKey.getState(state);
          },
        },
      }),
    ];
  },
});

function marker(page: number) {
  return () => {
    const el = document.createElement("div");
    el.className = "page-break-marker";
    el.contentEditable = "false";
    const label = document.createElement("span");
    label.className = "page-break-marker-label";
    label.textContent = `PAGE ${page}`;
    el.appendChild(label);
    return el;
  };
}

/**
 * Draws a marker after the top-level block that contains the tail text of
 * each printed page (from the real PDF render), so the user sees roughly
 * where pages break without pretending to be pixel-exact.
 */
export function setPageBreaks(editor: Editor, anchors: string[]) {
  const doc = editor.state.doc;
  const decorations: Decoration[] = [];
  const blocks: Array<{ end: number; text: string }> = [];
  doc.forEach((node, offset) => blocks.push({ end: offset + node.nodeSize, text: norm(node.textContent) }));
  let searchFrom = 0;
  anchors.forEach((anchor, i) => {
    // Anchors are the last words of a page; the final few identify the block.
    const tail = norm(anchor).split(" ").slice(-4).join(" ");
    for (let b = searchFrom; b < blocks.length; b++) {
      if (tail && blocks[b].text.includes(tail)) {
        decorations.push(Decoration.widget(blocks[b].end, marker(i + 2), { side: 1 }));
        searchFrom = b + 1;
        break;
      }
    }
  });
  editor.view.dispatch(editor.state.tr.setMeta(PageBreakKey, DecorationSet.create(doc, decorations)));
}
