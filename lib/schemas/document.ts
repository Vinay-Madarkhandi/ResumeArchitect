import { z } from "zod";

/**
 * Freeform rich-text resume document — the shape TipTap's editor produces
 * and consumes (a constrained subset of ProseMirror's JSON document format,
 * not TipTap's full arbitrary vocabulary). "Any structure" means no fixed
 * Experience/Education/Skills field types — just headings and lists you can
 * shape however you want — while staying a well-defined tree so it can be
 * rendered, serialized to Markdown for Gemini, and exported to PDF without
 * guessing at unknown node types. The editor (components/editor/DocumentCanvas.tsx)
 * is configured to only ever produce nodes/marks in this vocabulary.
 */

export const MarkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("link"), attrs: z.object({ href: z.string() }) }),
]);
export type Mark = z.infer<typeof MarkSchema>;

export const TextNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(MarkSchema).optional(),
});
export type TextNode = z.infer<typeof TextNodeSchema>;

export const HardBreakNodeSchema = z.object({
  type: z.literal("hardBreak"),
});
export type HardBreakNode = z.infer<typeof HardBreakNodeSchema>;

export const InlineNodeSchema = z.union([TextNodeSchema, HardBreakNodeSchema]);
export type InlineNode = z.infer<typeof InlineNodeSchema>;

export const HeadingNodeSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
  content: z.array(InlineNodeSchema).default([]),
});
export type HeadingNode = z.infer<typeof HeadingNodeSchema>;

export const ParagraphNodeSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(InlineNodeSchema).default([]),
});
export type ParagraphNode = z.infer<typeof ParagraphNodeSchema>;

// listItem/bulletList/orderedList are mutually recursive with the block
// union, so they're declared as plain TS interfaces first and tied back
// together with z.lazy() below (Zod v4's documented pattern for recursive
// schemas — a bare z.object() call can't reference itself or a schema
// declared later in the same module).
export interface ListItemNode {
  type: "listItem";
  content: BlockNode[];
}
export interface BulletListNode {
  type: "bulletList";
  content: ListItemNode[];
}
export interface OrderedListNode {
  type: "orderedList";
  attrs?: { start?: number };
  content: ListItemNode[];
}
export type BlockNode = HeadingNode | ParagraphNode | BulletListNode | OrderedListNode;

export const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.union([HeadingNodeSchema, ParagraphNodeSchema, BulletListNodeSchema, OrderedListNodeSchema]),
);

export const ListItemNodeSchema: z.ZodType<ListItemNode> = z.lazy(() =>
  z.object({
    type: z.literal("listItem"),
    content: z.array(BlockNodeSchema).default([]),
  }),
);

export const BulletListNodeSchema: z.ZodType<BulletListNode> = z.lazy(() =>
  z.object({
    type: z.literal("bulletList"),
    content: z.array(ListItemNodeSchema).default([]),
  }),
);

export const OrderedListNodeSchema: z.ZodType<OrderedListNode> = z.lazy(() =>
  z.object({
    type: z.literal("orderedList"),
    attrs: z.object({ start: z.number().optional() }).optional(),
    content: z.array(ListItemNodeSchema).default([]),
  }),
);

/**
 * A record of AI-changed text kept alongside the document so it can be
 * re-highlighted on every load — the highlight itself (see
 * lib/editor/aiHighlightExtension.ts) is a ProseMirror decoration, never
 * part of the document tree or the exported PDF, but the *record* of what
 * changed has to be saved somewhere or it's gone the moment the page
 * reloads. Bulk tailoring's highlights don't need this (they're re-derived
 * from tailoring_sessions.change_explanations on every load); this is for
 * single selection-scoped Ask AI edits, which have no other record.
 */
export const HighlightRecordSchema = z.object({
  quote: z.string(),
  tone: z.union([z.literal("change"), z.literal("flagged")]),
  title: z.string().optional(),
});
export type HighlightRecord = z.infer<typeof HighlightRecordSchema>;

export const DocumentContentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(BlockNodeSchema).default([]),
  highlights: z.array(HighlightRecordSchema).optional(),
});
export type DocumentContent = z.infer<typeof DocumentContentSchema>;

export function emptyDocumentContent(): DocumentContent {
  return { type: "doc", content: [{ type: "paragraph", content: [] }] };
}

/**
 * Distinguishes the new freeform document shape from the legacy typed
 * ResumeContent shape stored in old rows, without needing a DB migration —
 * `resumes.content` can hold either, and callers upgrade legacy rows to
 * this shape on read (see lib/documentConversion.ts).
 */
export function isDocumentContent(value: unknown): value is DocumentContent {
  return DocumentContentSchema.safeParse(value).success;
}
