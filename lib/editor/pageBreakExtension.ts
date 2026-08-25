import type { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { findQuoteRanges } from "@/lib/editor/aiHighlightExtension";

export const PageBreakPluginKey = new PluginKey("pageBreak");

/**
 * Visual page-break markers in the live canvas — an honest approximation,
 * not a pixel-perfect one. The canvas is HTML laid out by the browser; the
 * export is a PDF laid out by @react-pdf/renderer's own (Yoga-based)
 * engine, at a fixed page width the canvas doesn't share (especially once
 * it's user-resizable — see ResumeEditorClient's width slider). The two
 * will never wrap text at exactly the same point, so this doesn't try to
 * draw a break at an exact character; it renders the *actual* PDF, extracts
 * each page's real text (see the page-count route), and finds the nearest
 * TOP-LEVEL block boundary (a whole heading/paragraph/list) in the live
 * document containing that text's tail — "this section is the last thing
 * on page 1" rather than a false-precision line through a specific word.
 * Kept as a widget-decoration plugin, separate from aiHighlightExtension's
 * inline decorations: unrelated concerns, and a widget needs its own
 * DecorationSet lifecycle (replaced wholesale on every page-count refresh,
 * never merged with anything else).
 */
export const PageBreak = Extension.create({
  name: "pageBreak",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PageBreakPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(PageBreakPluginKey);
            if (meta?.decorations) return meta.decorations as DecorationSet;
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

/** The end position of the outermost doc child (heading/paragraph/list)
 * that contains `pos` — always a direct child of the document root, so a
 * widget inserted there is always a valid sibling of <h1>/<p>/<ul>, never
 * something invalid like a <div> stray between <li> siblings. */
function topLevelBlockEnd(doc: PMNode, pos: number): number {
  let result = pos;
  doc.forEach((node, offset) => {
    const start = offset;
    const end = offset + node.nodeSize;
    if (pos >= start && pos <= end) result = end;
  });
  return result;
}

function makeMarker(pageNumber: number): () => HTMLElement {
  return () => {
    const el = document.createElement("div");
    el.className = "page-break-marker";
    el.contentEditable = "false";
    el.setAttribute("data-page-break", "true");
    const label = document.createElement("span");
    label.className = "page-break-marker-label";
    label.textContent = `Page ${pageNumber}`;
    el.appendChild(label);
    return el;
  };
}

/** Renders one marker per page boundary. `anchors[i]` should be a snippet
 * of text — the tail of page `i + 1`'s real PDF content — used to locate
 * where that page ends in the live document; a snippet that can't be found
 * (rare — only if the live content has since diverged from what was last
 * rendered) is silently skipped rather than showing a wrong marker. */
export function setPageBreaks(editor: Editor, anchors: string[]): void {
  const doc = editor.state.doc;
  const decorations: Decoration[] = [];
  anchors.forEach((anchor, i) => {
    const [range] = findQuoteRanges(doc, [{ quote: anchor, tone: "change" }]);
    if (!range) return;
    const pos = topLevelBlockEnd(doc, range.to);
    decorations.push(Decoration.widget(pos, makeMarker(i + 2), { side: 1 }));
  });
  editor.view.dispatch(editor.state.tr.setMeta(PageBreakPluginKey, { decorations: DecorationSet.create(doc, decorations) }));
}

export function clearPageBreaks(editor: Editor): void {
  editor.view.dispatch(editor.state.tr.setMeta(PageBreakPluginKey, { decorations: DecorationSet.empty }));
}
