import { inlineToMarkdown, parseInline } from "@/lib/documentMarkdown";
import type {
  BlockNode,
  DocumentContent,
  HeadingNode,
  InlineNode,
  ListItemNode,
  ParagraphNode,
} from "@/lib/schemas/document";

/**
 * A resume as a flat sequence of "units": one per heading, paragraph, or
 * list item. The document tree is shallow in practice (sections of headings,
 * paragraphs, and bullet lists), and nearly every operation the product needs
 * is line-oriented: the AI rewrites a bullet, the diff aligns lines, revert
 * puts a line back. The flat form makes all three simple array operations,
 * and `fromUnits` regroups consecutive list items back into lists.
 */
export type UnitKind = "heading" | "paragraph" | "bullet" | "numbered";

export interface Unit {
  kind: UnitKind;
  /** Heading level, 1–3. Only set for headings. */
  level?: 1 | 2 | 3;
  /** Starting number of the list this item opened. Only set on the first numbered item. */
  start?: number;
  /** Original node, kept so formatting and nested content round-trip untouched. */
  node: HeadingNode | ParagraphNode | ListItemNode;
  /** Plain text, used for diffing, scoring, and matching. */
  text: string;
  /** Inline Markdown (bold/italic/links), the form the AI reads and writes. */
  markdown: string;
}

export function inlineText(nodes: InlineNode[]): string {
  return nodes.map((n) => (n.type === "text" ? n.text : " ")).join("");
}

function blocksText(blocks: BlockNode[]): string {
  return blocks
    .map((b) =>
      b.type === "heading" || b.type === "paragraph"
        ? inlineText(b.content)
        : b.content.map((item) => blocksText(item.content)).join(" "),
    )
    .join(" ");
}

function listItemMarkdown(item: ListItemNode): string {
  return item.content
    .map((b) =>
      b.type === "heading" || b.type === "paragraph"
        ? inlineToMarkdown(b.content)
        : b.content.map(listItemMarkdown).join("; "),
    )
    .join(" ")
    .trim();
}

export function toUnits(doc: DocumentContent): Unit[] {
  const units: Unit[] = [];
  for (const block of doc.content) {
    switch (block.type) {
      case "heading":
        units.push({
          kind: "heading",
          level: block.attrs.level,
          node: block,
          text: inlineText(block.content).trim(),
          markdown: inlineToMarkdown(block.content).trim(),
        });
        break;
      case "paragraph":
        units.push({
          kind: "paragraph",
          node: block,
          text: inlineText(block.content).trim(),
          markdown: inlineToMarkdown(block.content).trim(),
        });
        break;
      case "bulletList":
      case "orderedList":
        block.content.forEach((item, i) => {
          const numbered = block.type === "orderedList";
          units.push({
            kind: numbered ? "numbered" : "bullet",
            ...(numbered && i === 0 ? { start: block.attrs?.start ?? 1 } : {}),
            node: item,
            text: blocksText(item.content).replace(/\s+/g, " ").trim(),
            markdown: listItemMarkdown(item),
          });
        });
        break;
    }
  }
  return units;
}

export function fromUnits(units: Unit[]): DocumentContent {
  const content: BlockNode[] = [];
  for (const unit of units) {
    if (unit.kind === "heading" || unit.kind === "paragraph") {
      content.push(unit.node as HeadingNode | ParagraphNode);
      continue;
    }
    const listType = unit.kind === "bullet" ? "bulletList" : "orderedList";
    const last = content[content.length - 1];
    if (last && last.type === listType) {
      last.content.push(unit.node as ListItemNode);
    } else if (listType === "bulletList") {
      content.push({ type: "bulletList", content: [unit.node as ListItemNode] });
    } else {
      content.push({
        type: "orderedList",
        attrs: { start: unit.start ?? 1 },
        content: [unit.node as ListItemNode],
      });
    }
  }
  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph", content: [] }],
  };
}

/**
 * A list item holding more than one paragraph (e.g. sub-bullets) can't be
 * rewritten as a single line without losing structure, so it is read-only to
 * the AI.
 */
export function isLocked(unit: Unit): boolean {
  if (unit.kind !== "bullet" && unit.kind !== "numbered") return false;
  const item = unit.node as ListItemNode;
  return item.content.length !== 1 || item.content[0].type !== "paragraph";
}

/** Builds a unit of the given shape from inline Markdown, e.g. an AI rewrite. */
export function unitFromMarkdown(
  kind: UnitKind,
  markdown: string,
  opts: { level?: 1 | 2 | 3; start?: number } = {},
): Unit {
  const inline = parseInline(markdown.trim());
  const text = inlineText(inline).trim();
  if (kind === "heading") {
    const level = opts.level ?? 2;
    return { kind, level, node: { type: "heading", attrs: { level }, content: inline }, text, markdown: markdown.trim() };
  }
  if (kind === "paragraph") {
    return { kind, node: { type: "paragraph", content: inline }, text, markdown: markdown.trim() };
  }
  return {
    kind,
    ...(opts.start !== undefined ? { start: opts.start } : {}),
    node: { type: "listItem", content: [{ type: "paragraph", content: inline }] },
    text,
    markdown: markdown.trim(),
  };
}

/** Rebuilds `unit` with new inline Markdown, keeping its kind, level, and list position. */
export function withMarkdown(unit: Unit, markdown: string): Unit {
  return unitFromMarkdown(unit.kind, markdown, { level: unit.level, start: unit.start });
}

export function documentText(doc: DocumentContent): string {
  return toUnits(doc)
    .map((u) => u.text)
    .join("\n");
}
