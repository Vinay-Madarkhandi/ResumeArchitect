import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { BlockNode, DocumentContent, InlineNode, ListItemNode } from "@/lib/schemas/document";
import { registerResumeFonts } from "@/lib/pdf/fonts";
import type { Template } from "@/lib/resume/templates";

registerResumeFonts();

/**
 * Renders the resume document to PDF with @react-pdf/renderer: no headless
 * browser, so it runs in a serverless function. h1 is the name, h2 a section
 * heading, h3 an entry title (role, school, project).
 */
function makeStyles(t: Template) {
  return StyleSheet.create({
    page: {
      paddingVertical: 42,
      paddingHorizontal: 46,
      fontFamily: t.bodyFont,
      fontSize: t.size.body,
      color: t.color.ink,
      lineHeight: 1.42,
    },
    h1: { fontFamily: t.headingFont, fontSize: t.size.name, fontWeight: 700, lineHeight: 1.15, marginBottom: 6 },
    h2:
      t.sectionStyle === "rule"
        ? {
            fontFamily: t.headingFont,
            fontSize: t.size.section,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1.1,
            borderBottom: `0.75pt solid ${t.color.rule}`,
            paddingBottom: 3,
            marginTop: 13,
            marginBottom: 6,
          }
        : {
            fontFamily: t.headingFont,
            fontSize: t.size.section,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.4,
            color: t.color.accent,
            marginTop: 14,
            marginBottom: 5,
          },
    h3: { fontFamily: t.headingFont, fontSize: t.size.entry, fontWeight: 600, marginTop: 6, marginBottom: 1.5 },
    paragraph: { marginBottom: 3.5 },
    list: { marginBottom: 3.5 },
    row: { flexDirection: "row", marginBottom: 2, paddingLeft: 2 },
    glyph: { width: 11, color: t.color.muted },
    content: { flex: 1 },
    bold: { fontWeight: 700 },
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

function renderBlock(node: BlockNode, key: number, s: Styles): ReactNode {
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
        <Text key={key} style={s.paragraph}>
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

export function DocumentPdf({ doc, template, title }: { doc: DocumentContent; template: Template; title?: string }) {
  const s = makeStyles(template);
  return (
    <Document title={title} creator="ResumeArchitect" producer="ResumeArchitect">
      <Page size="A4" style={s.page}>
        {doc.content.map((block, i) => renderBlock(block, i, s))}
      </Page>
    </Document>
  );
}
