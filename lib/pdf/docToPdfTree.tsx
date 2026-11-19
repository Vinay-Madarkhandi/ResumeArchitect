import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { BlockNode, DocumentContent, InlineNode, ListItemNode } from "@/lib/schemas/document";
import { registerResumeFonts } from "@/lib/pdf/fonts";
import { boldWeight, resumeFontFamily, RESUME_PAGE, RESUME_SPACING as spacing, type Template } from "@/lib/resume/templates";

registerResumeFonts();

/**
 * Renders the resume document to PDF with @react-pdf/renderer: no headless
 * browser, so it runs in a serverless function. h1 is the name, h2 a section
 * heading, h3 an entry title (role, school, project). Section headings are
 * never letter-spaced: text extraction (what an ATS reads) turns tracked
 * capitals into "S U M M A RY".
 */
function makeStyles(t: Template) {
  const head = { fontFamily: resumeFontFamily(t.heading), fontWeight: boldWeight(t.heading) };
  const align = t.header === "center" ? "center" : "left";
  return StyleSheet.create({
    page: {
      paddingVertical: t.space.marginY,
      paddingHorizontal: t.space.marginX,
      fontFamily: resumeFontFamily(t.body),
      fontSize: t.size.body,
      color: t.color.ink,
      lineHeight: t.space.line,
    },
    h1: { ...head, fontSize: t.size.name, lineHeight: spacing.nameLine, marginBottom: spacing.nameAfter, textAlign: align },
    contact: { marginBottom: spacing.paragraphAfter, textAlign: align },
    h2: {
      ...head,
      fontSize: t.size.section,
      textTransform: t.sectionCase === "upper" ? "uppercase" : "none",
      color: t.sectionStyle === "accent" ? t.color.accent : t.color.ink,
      marginTop: t.space.section,
      marginBottom: spacing.sectionAfter,
      ...(t.sectionStyle === "rule" ? { borderBottom: `${spacing.sectionRule}pt solid ${t.color.rule}`, paddingBottom: spacing.sectionRulePad } : {}),
    },
    h3: { fontFamily: resumeFontFamily(t.heading), fontSize: t.size.entry, fontWeight: 600, marginTop: spacing.entryBefore, marginBottom: spacing.entryAfter },
    paragraph: { marginBottom: spacing.paragraphAfter },
    list: { marginBottom: spacing.paragraphAfter },
    row: { flexDirection: "row", marginBottom: spacing.bulletAfter, paddingLeft: 2 },
    glyph: { width: spacing.bulletIndent - 2, color: t.color.muted },
    content: { flex: 1 },
    bold: { fontWeight: boldWeight(t.body) },
    italic: { fontStyle: "italic" },
    link: { color: t.color.ink, textDecoration: "none" },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function renderInline(nodes: InlineNode[], s: Styles): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === "hardBreak") return <Text key={i}>{"\n"}</Text>;
    const marks = node.marks ?? [];
    const style = [
      ...(marks.some((m) => m.type === "bold") ? [s.bold] : []),
      ...(marks.some((m) => m.type === "italic") ? [s.italic] : []),
    ];
    const link = marks.find((m) => m.type === "link");
    if (link && link.type === "link") {
      return (
        <Link key={i} src={link.attrs.href} style={[...style, s.link]}>
          {node.text}
        </Link>
      );
    }
    return (
      <Text key={i} style={style}>
        {node.text}
      </Text>
    );
  });
}

function renderItem(item: ListItemNode, marker: string, key: number, s: Styles): ReactNode {
  return (
    <View key={key} style={s.row} wrap={false}>
      <Text style={s.glyph}>{marker}</Text>
      <View style={s.content}>{item.content.map((b, i) => renderBlock(b, i, s))}</View>
    </View>
  );
}

/** `contact` marks the paragraph right under the name, which follows the header alignment. */
function renderBlock(node: BlockNode, key: number, s: Styles, contact = false): ReactNode {
  switch (node.type) {
    case "heading": {
      if (node.content.length === 0) return null;
      const style = node.attrs.level === 1 ? s.h1 : node.attrs.level === 2 ? s.h2 : s.h3;
      return (
        <Text key={key} style={style} minPresenceAhead={node.attrs.level === 1 ? 0 : 24}>
          {renderInline(node.content, s)}
        </Text>
      );
    }
    case "paragraph":
      if (node.content.length === 0) return null;
      return (
        <Text key={key} style={contact ? s.contact : s.paragraph}>
          {renderInline(node.content, s)}
        </Text>
      );
    case "bulletList":
      return (
        <View key={key} style={s.list}>
          {node.content.map((item, i) => renderItem(item, "•", i, s))}
        </View>
      );
    case "orderedList": {
      const start = node.attrs?.start ?? 1;
      return (
        <View key={key} style={s.list}>
          {node.content.map((item, i) => renderItem(item, `${start + i}.`, i, s))}
        </View>
      );
    }
    default:
      return null;
  }
}

function isContactLine(blocks: BlockNode[], i: number): boolean {
  const prev = blocks[i - 1];
  return i > 0 && prev.type === "heading" && prev.attrs.level === 1 && blocks[i].type === "paragraph";
}

export function DocumentPdf({ doc, template, title }: { doc: DocumentContent; template: Template; title?: string }) {
  const s = makeStyles(template);
  return (
    <Document title={title} creator="ResumeArchitect" producer="ResumeArchitect">
      <Page size={RESUME_PAGE} style={s.page}>
        {doc.content.map((block, i) => renderBlock(block, i, s, isContactLine(doc.content, i)))}
      </Page>
    </Document>
  );
}

export function LetterPdf({ text, template, title }: { text: string; template: Template; title?: string }) {
  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <Document title={title} creator="ResumeArchitect" producer="ResumeArchitect">
      <Page
        size="A4"
        style={{ paddingVertical: 64, paddingHorizontal: 64, fontFamily: resumeFontFamily(template.body), fontSize: 10.5, lineHeight: 1.55, color: template.color.ink }}
      >
        {paragraphs.map((p, i) => (
          <Text key={i} style={{ marginBottom: 11 }}>
            {p}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
