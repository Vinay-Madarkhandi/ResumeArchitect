import type { BlockNode, DocumentContent, InlineNode, ListItemNode, Mark, TextNode } from "@/lib/schemas/document";

/**
 * Two-way Markdown<->document serializer. The node vocabulary in
 * lib/schemas/document.ts is deliberately small (headings, paragraphs,
 * lists, bold/italic/link), so a hand-written line-based converter is
 * realistic here and avoids pulling in a heavier Markdown-AST dependency.
 * This is what Gemini reads and writes for tailoring
 * (lib/gemini/prompts/tailorDocument.ts) — a single markdown string is a
 * far more reliable structured-output shape than asking a model to emit a
 * valid recursive JSON node tree.
 *
 * Italic uses `_underscores_` rather than `*asterisks*` so it can never be
 * confused with a `-`/`*` bullet marker at the start of a line.
 */

// ---------- document -> markdown ----------

export function documentToMarkdown(doc: DocumentContent): string {
  return doc.content.map(blockToMarkdown).filter(Boolean).join("\n\n");
}

function blockToMarkdown(block: BlockNode): string {
  switch (block.type) {
    case "heading":
      return `${"#".repeat(block.attrs.level)} ${inlineToMarkdown(block.content)}`.trim();
    case "paragraph":
      return inlineToMarkdown(block.content);
    case "bulletList":
      return block.content.map((item) => `- ${listItemToMarkdown(item)}`).join("\n");
    case "orderedList": {
      const start = block.attrs?.start ?? 1;
      return block.content.map((item, i) => `${start + i}. ${listItemToMarkdown(item)}`).join("\n");
    }
    default:
      return "";
  }
}

function listItemToMarkdown(item: ListItemNode): string {
  // List items in this app's documents are always a single paragraph (see
  // lib/documentConversion.ts) — join multiple blocks with a space rather
  // than supporting nested sub-lists, which the editor doesn't produce.
  return item.content.map((block) => blockToMarkdown(block)).join(" ").trim();
}

function inlineToMarkdown(nodes: InlineNode[]): string {
  return nodes.map((node) => (node.type === "hardBreak" ? "  \n" : textNodeToMarkdown(node))).join("");
}

function textNodeToMarkdown(node: TextNode): string {
  let text = escapeMarkdown(node.text);
  const marks = node.marks ?? [];
  if (marks.some((m) => m.type === "italic")) text = `_${text}_`;
  if (marks.some((m) => m.type === "bold")) text = `**${text}**`;
  const link = marks.find((m) => m.type === "link");
  if (link && link.type === "link") text = `[${text}](${link.attrs.href})`;
  return text;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([*_[\]])/g, "\\$1");
}

function unescapeMarkdown(text: string): string {
  return text.replace(/\\([*_[\]])/g, "$1");
}

// ---------- markdown -> document ----------

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const BULLET_RE = /^[-*]\s+(.*)$/;
const ORDERED_RE = /^(\d+)\.\s+(.*)$/;

function isBlockStart(trimmed: string): boolean {
  return HEADING_RE.test(trimmed) || BULLET_RE.test(trimmed) || ORDERED_RE.test(trimmed);
}

export function markdownToDocument(markdown: string): DocumentContent {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", attrs: { level }, content: parseInline(headingMatch[2]) });
      i++;
      continue;
    }

    if (BULLET_RE.test(trimmed)) {
      const items: ListItemNode[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(BULLET_RE);
        if (!m) break;
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(m[1]) }] });
        i++;
      }
      blocks.push({ type: "bulletList", content: items });
      continue;
    }

    const orderedStart = trimmed.match(ORDERED_RE);
    if (orderedStart) {
      const start = Number(orderedStart[1]);
      const items: ListItemNode[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(ORDERED_RE);
        if (!m) break;
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(m[1]) }] });
        i++;
      }
      blocks.push({ type: "orderedList", attrs: { start }, content: items });
      continue;
    }

    // A plain paragraph: consume consecutive non-blank, non-special lines
    // as one paragraph, collapsing soft wraps into spaces.
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i].trim())) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "paragraph", content: parseInline(paraLines.join(" ")) });
  }

  return { type: "doc", content: blocks.length > 0 ? blocks : [{ type: "paragraph", content: [] }] };
}

const INLINE_RE = /(\*\*(.+?)\*\*)|(_(.+?)_)|(\[(.+?)\]\((.+?)\))/g;

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) pushPlain(nodes, text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      nodes.push(textNode(unescapeMarkdown(match[2]), [{ type: "bold" }]));
    } else if (match[3] !== undefined) {
      nodes.push(textNode(unescapeMarkdown(match[4]), [{ type: "italic" }]));
    } else if (match[5] !== undefined) {
      nodes.push(textNode(unescapeMarkdown(match[6]), [{ type: "link", attrs: { href: match[7] } }]));
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) pushPlain(nodes, text.slice(lastIndex));

  return nodes;
}

function pushPlain(nodes: InlineNode[], text: string) {
  const unescaped = unescapeMarkdown(text);
  if (unescaped) nodes.push(textNode(unescaped));
}

function textNode(text: string, marks?: Mark[]): TextNode {
  return marks && marks.length > 0 ? { type: "text", text, marks } : { type: "text", text };
}
