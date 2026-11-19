import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { documentToDocx } from "@/lib/docx/docToDocx";
import { TEMPLATES } from "@/lib/resume/templates";

describe("documentToDocx", () => {
  it("writes a Word file whose text matches the resume", async () => {
    const doc = markdownToDocument(
      "# Ada Lovelace\n\n[ada.dev](https://ada.dev) · ada@example.com\n\n## Experience\n\n- Built **Go** services\n- Cut costs 30%\n\n1. First\n2. Second",
    );
    const buffer = await documentToDocx(doc, TEMPLATES.modern, "Ada");
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const { value } = await mammoth.extractRawText({ buffer });
    for (const text of ["Ada Lovelace", "ada.dev", "EXPERIENCE", "Built Go services", "Cut costs 30%", "Second"]) {
      expect(value).toContain(text);
    }
  });
});

describe("letterToDocx", () => {
  it("writes each paragraph of the letter", async () => {
    const { letterToDocx } = await import("@/lib/docx/docToDocx");
    const buffer = await letterToDocx("Dear Hiring Manager,\n\nI built payment services.\n\nAda Lovelace", TEMPLATES.classic);
    const { value } = await mammoth.extractRawText({ buffer });
    expect(value).toContain("I built payment services.");
    expect(value).toContain("Ada Lovelace");
  });
});

describe("the Standard template", () => {
  it("centers the name and contact line and keeps section headings as written", async () => {
    const JSZip = (await import("jszip")).default;
    const doc = markdownToDocument("# Ada Lovelace\n\nada@example.com · London\n\n## Work Experience\n\n- Built Go services");
    const buffer = await documentToDocx(doc, TEMPLATES.standard, "Ada");
    const zip = await JSZip.loadAsync(buffer);
    const fontTable = await zip.file("word/fontTable.xml")!.async("string");
    expect(fontTable).toContain('w:name="Hanken Grotesk"');
    expect(fontTable).toContain("w:embedRegular");
    expect(fontTable).toContain("w:embedBoldItalic");
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/);
    const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)!;
    expect(paragraphs.find((p) => p.includes("Ada Lovelace"))).toContain('<w:jc w:val="center"/>');
    expect(paragraphs.find((p) => p.includes("ada@example.com"))).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain("Work Experience");
    expect(xml).not.toContain("WORK EXPERIENCE");
  });
});
