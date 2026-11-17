import { describe, expect, it } from "vitest";
import { documentToMarkdown, markdownToDocument } from "@/lib/documentMarkdown";

describe("markdownToDocument", () => {
  it("keeps the text of numbered list items", () => {
    const doc = markdownToDocument("1. First step\n2. Second step");
    expect(documentToMarkdown(doc)).toBe("1. First step\n2. Second step");
  });

  it("round-trips headings, bullets, and inline marks", () => {
    const md = "# Ada\n\n## Experience\n\n- Built **Go** services for _payments_\n- See [site](https://ada.dev)";
    expect(documentToMarkdown(markdownToDocument(md))).toBe(md);
  });
});
