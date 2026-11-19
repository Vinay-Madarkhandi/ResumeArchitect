import { createElement } from "react";
import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { renderToBuffer } from "@react-pdf/renderer";
import { extractText, getDocumentProxy } from "unpdf";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { documentToDocx } from "@/lib/docx/docToDocx";
import { DocumentPdf } from "@/lib/pdf/docToPdfTree";
import { TEMPLATE_IDS, TEMPLATE_LIST, getTemplate, type Template } from "@/lib/resume/templates";

const RESUME = markdownToDocument(`# Ada Lovelace

ada@example.com · +44 20 7946 0958 · [ada.dev](https://ada.dev)

## Summary

Backend engineer who builds **dependable** payment systems and enjoys teaching.

## Work Experience

### Senior Engineer — Analytical Engines Ltd

London · 2020 – Present

- Built a Kafka pipeline that cut invoice latency by 38%
- Ran the _on-call_ rotation and incident reviews

## Education

### BSc Mathematics, University of London

## Skills

Go, PostgreSQL, Kafka, Docker

1. First numbered point
2. Second numbered point`);

/** Words in reading order; list glyphs are dropped because Word draws them from numbering, not text. */
function words(text: string): string[] {
  return text
    .split(/\s+/)
    .filter((w) => w && w !== "•" && !/^\d+\.$/.test(w));
}

async function pdfWords(t: Template) {
  const buffer = await renderToBuffer(createElement(DocumentPdf, { doc: RESUME, template: t }) as Parameters<typeof renderToBuffer>[0]);
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(buffer)), { mergePages: true });
  return words(text);
}

async function docxWords(t: Template) {
  const { value } = await mammoth.extractRawText({ buffer: await documentToDocx(RESUME, t, "Ada") });
  return words(value);
}

describe("templates", () => {
  it("offers at least five ATS-safe templates", () => {
    expect(TEMPLATE_IDS.length).toBeGreaterThanOrEqual(5);
    for (const t of TEMPLATE_LIST) {
      expect(t.size.body).toBeGreaterThanOrEqual(9);
    }
  });

  it("falls back to Classic for an unknown id", () => {
    expect(getTemplate("comic-sans").id).toBe("classic");
    expect(getTemplate("executive").id).toBe("executive");
  });

  it.each(TEMPLATE_IDS)("%s writes the same text, in the same order, to PDF and Word", async (id) => {
    const t = getTemplate(id);
    const [pdf, docx] = await Promise.all([pdfWords(t), docxWords(t)]);
    expect(pdf).toEqual(docx);
    expect(pdf.join(" ")).toContain("Built a Kafka pipeline that cut invoice latency by 38%");
    expect(pdf).toContain(t.sectionCase === "upper" ? "EXPERIENCE" : "Experience");
  }, 30_000);

  it("changes only the typesetting: every template carries the same words", async () => {
    const asWritten = (ws: string[]) => ws.map((w) => w.toLowerCase());
    const [first, ...rest] = await Promise.all(TEMPLATE_IDS.map((id) => docxWords(getTemplate(id))));
    for (const other of rest) expect(asWritten(other)).toEqual(asWritten(first));
  }, 30_000);
});
