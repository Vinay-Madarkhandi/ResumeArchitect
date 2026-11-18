import { inlineText } from "@/lib/resume/units";
import type { BlockNode, DocumentContent } from "@/lib/schemas/document";

const contactSection = /^(?:contact(?: details| information)?|personal (?:details|information))\s*:?$/i;
const email = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const phone = /(?<!\w)\+?\d[\d(). -]{6,}\d(?!\w)/g;

function containsContact(block: Extract<BlockNode, { type: "heading" | "paragraph" }>) {
  const text = inlineText(block.content);
  return email.test(text)
    || [...text.matchAll(phone)].some(([number]) => number.replace(/\D/g, "").length >= 10)
    || block.content.some((node) => node.type === "text"
      && node.marks?.some((mark) => mark.type === "link" && /^(mailto|tel):/i.test(mark.attrs.href)));
}

function withoutContact(blocks: BlockNode[]): BlockNode[] {
  const safe: BlockNode[] = [];
  let sectionLevel: number | undefined;
  for (const block of blocks) {
    if (block.type === "heading") {
      if (sectionLevel !== undefined && block.attrs.level > sectionLevel) continue;
      sectionLevel = undefined;
      if (contactSection.test(inlineText(block.content).trim())) {
        sectionLevel = block.attrs.level;
        continue;
      }
    }
    if (sectionLevel !== undefined) continue;
    if (block.type === "heading" || block.type === "paragraph") {
      if (!containsContact(block)) safe.push(block);
      continue;
    }
    const items = block.content.map((item) => ({ ...item, content: withoutContact(item.content) }))
      .filter((item) => item.content.length > 0);
    if (items.length > 0) safe.push({ ...block, content: items });
  }
  return safe;
}

export function sharedDocument(doc: DocumentContent, hideContact: boolean): DocumentContent {
  // Share only printable content, dropping editor-only highlights and their tooltips.
  if (!hideContact) return { type: "doc", content: doc.content };
  const first = doc.content[0];
  const name = first?.type === "heading" && first.attrs.level === 1 ? [first] : [];
  const start = doc.content.findIndex((block, index) => index >= name.length && block.type === "heading" && block.attrs.level === 2);
  return { type: "doc", content: withoutContact([...name, ...(start < 0 ? [] : doc.content.slice(start))]) };
}
