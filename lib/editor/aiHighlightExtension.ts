import type { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export const AiHighlightPluginKey = new PluginKey("aiHighlight");

export interface HighlightQuote {
  quote: string;
  tone: "change" | "flagged";
  title?: string;
}

/**
 * Highlights AI-tailored/AI-edited text while editing, using ProseMirror
 * Decorations rather than a stored mark in the document schema — a
 * deliberate choice, not just an implementation detail: decorations are
 * pure client-side rendering state, never part of `editor.getJSON()`, so
 * they can never end up persisted, autosaved, or in an exported PDF. There
 * is no "strip the highlight before export" step to forget, because there
 * is nothing to strip — the export pipeline (lib/pdf/docToPdfTree.tsx)
 * only ever sees the document's actual node/mark content.
 */
export const AiHighlight = Extension.create({
  name: "aiHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AiHighlightPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(AiHighlightPluginKey);
            if (meta?.clear) return DecorationSet.empty;
            if (meta?.decorations) return meta.decorations as DecorationSet;
            const mapped = old.map(tr.mapping, tr.doc);
            if (meta?.add) return mapped.add(tr.doc, meta.add as Decoration[]);
            return mapped;
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

/**
 * Finds the first occurrence of each quote in the document's flattened
 * text and maps it back to real document positions. Block boundaries are
 * represented as a space in the flattened text so a quote can never
 * spuriously span across two separate paragraphs/headings/list items.
 */
export function findQuoteRanges(
  doc: PMNode,
  quotes: HighlightQuote[],
): { from: number; to: number; tone: "change" | "flagged"; title?: string }[] {
  let text = "";
  const positions: number[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        text += node.text[i];
        positions.push(pos + i);
      }
    } else if (node.isBlock) {
      text += " ";
      positions.push(pos);
    }
  });

  const lowerText = text.toLowerCase();
  const ranges: { from: number; to: number; tone: "change" | "flagged"; title?: string }[] = [];

  for (const { quote, tone, title } of quotes) {
    const needle = quote.trim().toLowerCase();
    if (!needle) continue;
    const idx = lowerText.indexOf(needle);
    if (idx === -1) continue;
    const from = positions[idx];
    const to = positions[idx + needle.length - 1] + 1;
    ranges.push({ from, to, tone, title });
  }

  return ranges;
}

export function buildHighlightDecorations(
  doc: PMNode,
  quotes: HighlightQuote[],
): DecorationSet {
  const ranges = findQuoteRanges(doc, quotes);
  const decorations = ranges.map(({ from, to, tone, title }) =>
    Decoration.inline(from, to, {
      class: tone === "flagged" ? "ai-highlight ai-highlight-flagged" : "ai-highlight",
      ...(title ? { title } : {}),
    }),
  );
  return DecorationSet.create(doc, decorations);
}

/** Replaces the whole highlight set — used once, right after a tailored
 * resume's content loads, to mark up everything the bulk tailoring run
 * touched. */
export function setHighlights(editor: Editor, quotes: HighlightQuote[]): void {
  const decorations = buildHighlightDecorations(editor.state.doc, quotes);
  editor.view.dispatch(editor.state.tr.setMeta(AiHighlightPluginKey, { decorations }));
}

/** Adds one highlight on top of whatever's already there — used right
 * after accepting a single selection-scoped Ask AI edit
 * (AskAiBubbleMenu), without disturbing any highlights already present
 * from the bulk tailoring run. */
export function addHighlight(editor: Editor, from: number, to: number, tone: "change" | "flagged" = "change", title?: string): void {
  const decoration = Decoration.inline(from, to, {
    class: tone === "flagged" ? "ai-highlight ai-highlight-flagged" : "ai-highlight",
    ...(title ? { title } : {}),
  });
  editor.view.dispatch(editor.state.tr.setMeta(AiHighlightPluginKey, { add: [decoration] }));
}
