import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { BlockNode, DocumentContent, InlineNode, ListItemNode } from "@/lib/schemas/document";
import type { Template } from "@/lib/resume/templates";

/**
 * Writes the resume as an editable Word document using real Word structures
 * (styles, numbering, hyperlinks) so it stays ATS-friendly and easy to edit.
 */

const pt = (n: number) => Math.round(n * 2); // docx sizes are half-points
const hex = (c: string) => c.replace("#", "");

function runs(nodes: InlineNode[], t: Template, base: { bold?: boolean; size?: number; font?: string; color?: string } = {}): ParagraphChild[] {
  return nodes.map((node) => {
    if (node.type === "hardBreak") return new TextRun({ text: "", break: 1 });
    const marks = node.marks ?? [];
    const run = new TextRun({
      text: node.text,
      bold: base.bold || marks.some((m) => m.type === "bold"),
      italics: marks.some((m) => m.type === "italic"),
      size: base.size,
      font: base.font,
      color: base.color,
    });
    const link = marks.find((m) => m.type === "link");
    if (link && link.type === "link") {
      return new ExternalHyperlink({ link: link.attrs.href, children: [run] });
    }
    return run;
  });
}

function blockParagraphs(block: BlockNode, t: Template, ordinal: { n: number }): Paragraph[] {
  switch (block.type) {
    case "heading": {
      if (block.attrs.level === 1) {
        return [
          new Paragraph({
            spacing: { after: 80 },
            children: runs(block.content, t, { bold: true, size: pt(t.size.name), font: t.docxHeadingFont }),
          }),
        ];
      }
      if (block.attrs.level === 2) {
        return [
          new Paragraph({
            spacing: { before: 240, after: 100 },
            keepNext: true,
            border:
              t.sectionStyle === "rule"
                ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(t.color.rule), space: 2 } }
                : undefined,
            children: runs(
              block.content.map((n) => (n.type === "text" ? { ...n, text: n.text.toUpperCase() } : n)),
              t,
              {
                bold: true,
                size: pt(t.size.section),
                font: t.docxHeadingFont,
                color: t.sectionStyle === "accent" ? hex(t.color.accent) : undefined,
              },
            ),
          }),
        ];
      }
      return [
        new Paragraph({
          spacing: { before: 100, after: 20 },
          keepNext: true,
          children: runs(block.content, t, { bold: true, size: pt(t.size.entry), font: t.docxHeadingFont }),
        }),
      ];
    }
    case "paragraph":
      return [new Paragraph({ spacing: { after: 60 }, children: runs(block.content, t) })];
    case "bulletList":
      return block.content.flatMap((item) => itemParagraphs(item, t, { reference: "bullets", level: 0 }));
    case "orderedList": {
      const instance = ++ordinal.n;
      return block.content.flatMap((item) => itemParagraphs(item, t, { reference: "numbers", level: 0, instance }));
    }
    default:
      return [];
  }
}

function itemParagraphs(
  item: ListItemNode,
  t: Template,
  numbering: { reference: string; level: number; instance?: number },
): Paragraph[] {
  const [first, ...rest] = item.content;
  const firstInline = first && (first.type === "paragraph" || first.type === "heading") ? first.content : [];
  const out = [new Paragraph({ numbering, spacing: { after: 30 }, children: runs(firstInline, t) })];
  for (const block of rest) {
    if (block.type === "bulletList" || block.type === "orderedList") {
      for (const sub of block.content) {
        out.push(...itemParagraphs(sub, t, { ...numbering, level: Math.min(numbering.level + 1, 2) }));
      }
    } else if (block.type === "paragraph" || block.type === "heading") {
      out.push(new Paragraph({ indent: { left: 360 }, children: runs(block.content, t) }));
    }
  }
  return out;
}

export async function documentToDocx(doc: DocumentContent, template: Template, title?: string): Promise<Buffer> {
  const ordinal = { n: 0 };
  const file = new Document({
    title,
    creator: "ResumeArchitect",
    styles: {
      default: {
        document: {
          run: { font: template.docxBodyFont, size: pt(template.size.body + 0.75), color: hex(template.color.ink) },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: level === 0 ? "•" : "◦",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 240 } } },
          })),
        },
        {
          reference: "numbers",
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 300 } } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
        children: doc.content.flatMap((block) => blockParagraphs(block, template, ordinal)),
      },
    ],
  });
  return Packer.toBuffer(file);
}
