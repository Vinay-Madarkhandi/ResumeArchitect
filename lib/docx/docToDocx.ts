import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { BlockNode, DocumentContent, InlineNode, ListItemNode } from "@/lib/schemas/document";
import { resumeFontFamily, RESUME_PAGE, RESUME_SPACING as spacing, type Face, type Template } from "@/lib/resume/templates";

/**
 * Writes the resume as an editable Word document using real Word structures
 * (styles, numbering, hyperlinks) so it stays ATS-friendly and easy to edit.
 */

const pt = (n: number) => Math.round(n * 2); // docx sizes are half-points
const twips = (n: number) => Math.round(n * 20);
const hex = (c: string) => c.replace("#", "");

const line = (size: number, multiple: number) => ({
  line: twips(size * multiple), lineRule: LineRuleType.EXACT,
});

async function embeddedFace(face: Face) {
  const read = (file: string) => readFile(join(process.cwd(), "public", "fonts", file));
  const [data, bold, italic, boldItalic] = await Promise.all(face === "serif"
    ? [read("SourceSerif4-Regular.ttf"), read("SourceSerif4-SemiBold.ttf"), read("SourceSerif4-Italic.ttf")]
    : [read("HankenGrotesk-Regular.ttf"), read("HankenGrotesk-Bold.ttf"), read("HankenGrotesk-Italic.ttf"), read("HankenGrotesk-BoldItalic.ttf")]);
  return { name: resumeFontFamily(face), data, bold, italic, boldItalic };
}

function runs(nodes: InlineNode[], base: { bold?: boolean; size?: number; font?: string; color?: string } = {}): ParagraphChild[] {
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
  const headingFont = resumeFontFamily(t.heading);
  const headerAlign = t.header === "center" ? AlignmentType.CENTER : undefined;
  switch (block.type) {
    case "heading": {
      if (block.attrs.level === 1) {
        return [
          new Paragraph({
            outlineLevel: 0,
            spacing: { ...line(t.size.name, spacing.nameLine), after: twips(spacing.nameAfter) },
            alignment: headerAlign,
            children: runs(block.content, { bold: true, size: pt(t.size.name), font: headingFont }),
          }),
        ];
      }
      if (block.attrs.level === 2) {
        return [
          new Paragraph({
            outlineLevel: 1,
            spacing: { ...line(t.size.section, t.space.line), before: twips(t.space.section), after: twips(spacing.sectionAfter) },
            keepNext: true,
            border:
              t.sectionStyle === "rule"
                ? { bottom: { style: BorderStyle.SINGLE, size: spacing.sectionRule * 8, color: hex(t.color.rule), space: spacing.sectionRulePad } }
                : undefined,
            children: runs(
              t.sectionCase === "upper"
                ? block.content.map((n) => (n.type === "text" ? { ...n, text: n.text.toUpperCase() } : n))
                : block.content,
              {
                bold: true,
                size: pt(t.size.section),
                font: headingFont,
                color: t.sectionStyle === "accent" ? hex(t.color.accent) : undefined,
              },
            ),
          }),
        ];
      }
      return [
        new Paragraph({
          outlineLevel: 2,
          spacing: { ...line(t.size.entry, t.space.line), before: twips(spacing.entryBefore), after: twips(spacing.entryAfter) },
          keepNext: true,
          children: runs(block.content, { bold: true, size: pt(t.size.entry), font: headingFont }),
        }),
      ];
    }
    case "paragraph":
      return [new Paragraph({ spacing: { after: twips(spacing.paragraphAfter) }, alignment: contact ? headerAlign : undefined, children: runs(block.content) })];
    case "bulletList":
      return block.content.flatMap((item) => itemParagraphs(item, { reference: "bullets", level: 0 }));
    case "orderedList": {
      const instance = ++ordinal.n;
      return block.content.flatMap((item) => itemParagraphs(item, { reference: "numbers", level: 0, instance }));
    }
    default:
      return [];
  }
}

function itemParagraphs(
  item: ListItemNode,
  numbering: { reference: string; level: number; instance?: number },
): Paragraph[] {
  const [first, ...rest] = item.content;
  const firstInline = first && (first.type === "paragraph" || first.type === "heading") ? first.content : [];
  const out = [new Paragraph({ numbering, spacing: { after: twips(spacing.bulletAfter) }, children: runs(firstInline) })];
  for (const block of rest) {
    if (block.type === "bulletList" || block.type === "orderedList") {
      for (const sub of block.content) {
        out.push(...itemParagraphs(sub, { ...numbering, level: Math.min(numbering.level + 1, 2) }));
      }
    } else if (block.type === "paragraph" || block.type === "heading") {
      out.push(new Paragraph({ indent: { left: twips(spacing.bulletIndent) }, children: runs(block.content) }));
    }
  }
  return out;
}

export async function documentToDocx(doc: DocumentContent, template: Template, title?: string): Promise<Buffer> {
  const ordinal = { n: 0 };
  const file = new Document({
    title,
    creator: "ResumeArchitect",
    fonts: await Promise.all([...new Set([template.body, template.heading])].map(embeddedFace)),
    styles: {
      default: {
        document: {
          run: { font: resumeFontFamily(template.body), size: pt(template.size.body), color: hex(template.color.ink) },
          paragraph: { spacing: line(template.size.body, template.space.line) },
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
            style: { paragraph: { indent: { left: twips(spacing.bulletIndent * (level + 1)), hanging: twips(spacing.bulletIndent - 2) } } },
          })),
        },
        {
          reference: "numbers",
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: twips(spacing.bulletIndent * (level + 1)), hanging: twips(spacing.bulletIndent - 2) } } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: twips(RESUME_PAGE.width), height: twips(RESUME_PAGE.height) },
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
          run: { font: template.body === "serif" ? "Georgia" : "Calibri", size: pt(11), color: hex(template.color.ink) },
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
