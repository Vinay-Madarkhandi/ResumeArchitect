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
const twips = (n: number) => Math.round(n * 20);
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

/** `contact` marks the paragraph right under the name, which follows the header alignment. */
function blockParagraphs(block: BlockNode, t: Template, ordinal: { n: number }, contact = false): Paragraph[] {
  const headerAlign = t.header === "center" ? AlignmentType.CENTER : undefined;
  switch (block.type) {
    case "heading": {
      if (block.attrs.level === 1) {
        return [
          new Paragraph({
            spacing: { after: 80 },
            alignment: headerAlign,
            children: runs(block.content, t, { bold: true, size: pt(t.size.name), font: t.docxHeadingFont }),
          }),
        ];
      }
      if (block.attrs.level === 2) {
        return [
          new Paragraph({
            spacing: { before: twips(t.space.section), after: 100 },
            keepNext: true,
            border:
              t.sectionStyle === "rule"
                ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(t.color.rule), space: 2 } }
                : undefined,
            children: runs(
              t.sectionCase === "upper"
                ? block.content.map((n) => (n.type === "text" ? { ...n, text: n.text.toUpperCase() } : n))
                : block.content,
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
      return [new Paragraph({ spacing: { after: 60 }, alignment: contact ? headerAlign : undefined, children: runs(block.content, t) })];
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
          paragraph: { spacing: { line: Math.round(240 * template.space.line) } },
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
        properties: {
          page: {
            margin: {
              top: twips(template.space.marginY),
              bottom: twips(template.space.marginY),
              left: twips(template.space.marginX),
              right: twips(template.space.marginX),
            },
          },
        },
        children: doc.content.flatMap((block, i) => {
          const prev = doc.content[i - 1];
          const contact = prev?.type === "heading" && prev.attrs.level === 1 && block.type === "paragraph";
          return blockParagraphs(block, template, ordinal, contact);
        }),
      },
    ],
  });
  return Packer.toBuffer(file);
}

/** A cover letter as a Word document: plain paragraphs in the template's body face. */
export async function letterToDocx(text: string, template: Template, title?: string): Promise<Buffer> {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const file = new Document({
    title,
    creator: "ResumeArchitect",
    styles: {
      default: {
        document: {
          run: { font: template.docxBodyFont, size: pt(11), color: hex(template.color.ink) },
          paragraph: { spacing: { line: 300, after: 200 } },
        },
      },
    },
    sections: [
      {
        properties: { page: { margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } } },
        children: paragraphs.map(
          (p) =>
            new Paragraph({
              children: p.split("\n").map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0 })),
            }),
        ),
      },
    ],
  });
  return Packer.toBuffer(file);
}
