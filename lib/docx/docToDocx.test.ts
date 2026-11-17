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
