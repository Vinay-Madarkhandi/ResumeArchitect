import { Document, Page, View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { BlockNode, DocumentContent, InlineNode, ListItemNode } from "@/lib/schemas/document";
import { pdfColors, pdfFonts, pdfType } from "@/lib/pdf/tokens";
import { registerResumeFonts } from "@/lib/pdf/fonts";

registerResumeFonts();

/**
 * Renders the freeform document (lib/schemas/document.ts) straight to
 * @react-pdf/renderer primitives — no headless browser, reusing the exact
 * fonts/tokens the old ResumeDocumentPdf used, so export stays cheap and
 * Vercel-serverless-friendly. Headings carry the visual weight that used to
 * come from fixed section types: h1 ~ name, h2 ~ section header (uppercase,
 * underlined), h3 ~ entry title. Deliberately left-aligned rather than
 * special-casing "the first heading is centered" — the document is now
 * genuinely freeform, so rendering stays predictable rather than guessing
 * intent from position.
 */

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: pdfFonts.doc,
    fontSize: pdfType.body,
    color: pdfColors.ink,
    lineHeight: 1.4,
  },
  h1: {
    fontFamily: pdfFonts.sans,
    fontSize: pdfType.name,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  h2: {
    fontFamily: pdfFonts.sans,
    fontSize: pdfType.sectionHeader,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: pdfColors.ink,
    borderBottom: `0.75pt solid ${pdfColors.hairline}`,
    paddingBottom: 3,
    marginTop: 12,
    marginBottom: 6,
  },
  h3: {
    fontFamily: pdfFonts.sans,
    fontSize: pdfType.body + 0.5,
    fontWeight: 600,
    marginTop: 6,
    marginBottom: 2,
  },
  paragraph: {
    marginBottom: 4,
  },
  list: {
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 4,
  },
  bulletGlyph: { width: 12, fontSize: pdfType.body },
  bulletContent: { flex: 1 },
  bold: { fontWeight: 700 },
  italic: { fontStyle: "italic" },
  link: { color: pdfColors.accent, textDecoration: "none" },
});

function renderInline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === "hardBreak") return <Text key={i}>{"\n"}</Text>;

    const marks = node.marks ?? [];
    const style = [
      ...(marks.some((m) => m.type === "bold") ? [styles.bold] : []),
      ...(marks.some((m) => m.type === "italic") ? [styles.italic] : []),
    ];
    const linkMark = marks.find((m) => m.type === "link");

    if (linkMark && linkMark.type === "link") {
      return (
        <Link key={i} src={linkMark.attrs.href} style={[...style, styles.link]}>
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

function renderListItem(item: ListItemNode, marker: string, key: number): ReactNode {
  return (
    <View key={key} style={styles.bulletRow} wrap={false}>
      <Text style={styles.bulletGlyph}>{marker}</Text>
      <View style={styles.bulletContent}>{item.content.map((block, i) => renderBlock(block, i))}</View>
    </View>
  );
}

function renderBlock(node: BlockNode, key: number): ReactNode {
  switch (node.type) {
    case "heading": {
      const style = node.attrs.level === 1 ? styles.h1 : node.attrs.level === 2 ? styles.h2 : styles.h3;
      if (node.content.length === 0) return null;
      return (
        <Text key={key} style={style}>
          {renderInline(node.content)}
        </Text>
      );
    }
    case "paragraph": {
      if (node.content.length === 0) return null;
      return (
        <Text key={key} style={styles.paragraph}>
          {renderInline(node.content)}
        </Text>
      );
    }
    case "bulletList":
      return (
        <View key={key} style={styles.list}>
          {node.content.map((item, i) => renderListItem(item, "•", i))}
        </View>
      );
    case "orderedList": {
      const start = node.attrs?.start ?? 1;
      return (
        <View key={key} style={styles.list}>
          {node.content.map((item, i) => renderListItem(item, `${start + i}.`, i))}
        </View>
      );
    }
    default:
      return null;
  }
}

export function DocumentPdf({ doc }: { doc: DocumentContent }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {doc.content.map((block, i) => renderBlock(block, i))}
      </Page>
    </Document>
  );
}
