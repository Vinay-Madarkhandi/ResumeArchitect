import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { formattingChecks } from "./formatting";
import type { FormattingCheckId, LayoutFacts, ResumeFileFacts } from "./report";
import { readResume } from "./resume";

const resume = (markdown: string) => readResume(markdownToDocument(markdown));
const WORK = resume("## Experience\n\n- Built Go services");

const CLEAN: LayoutFacts = {
  tables: 0,
  images: 0,
  textBoxes: 0,
  columns: 1,
  headerText: "",
  footerText: "Page 1 of 2",
  fonts: ["Calibri", "Times New Roman"],
  bulletChars: ["•"],
};

function check(id: FormattingCheckId, facts: Partial<LayoutFacts>, text = "## Experience\n\n- Built Go services") {
  const file: ResumeFileFacts = { format: "docx", ...CLEAN, ...facts };
  return formattingChecks(file, resume(text)).find((c) => c.id === id) ?? null;
}

describe("formattingChecks", () => {
  it("passes a clean single-column Word file on every check", () => {
    const checks = formattingChecks({ format: "docx", ...CLEAN }, WORK);
    expect(checks.map((c) => [c.id, c.status])).toEqual([
      ["tables", "pass"],
      ["header-footer", "pass"],
      ["images", "pass"],
      ["columns", "pass"],
      ["text-boxes", "pass"],
      ["fonts", "pass"],
      ["special-characters", "pass"],
      ["section-heading-names", "pass"],
    ]);
  });

  it("leaves out what a PDF can't report", () => {
    const pdf: ResumeFileFacts = { format: "pdf", hasTextLayer: true, ...CLEAN, tables: null, textBoxes: null, headerText: null, footerText: null };
    expect(formattingChecks(pdf, WORK).map((c) => c.id)).toEqual(["images", "columns", "fonts", "special-characters", "section-heading-names"]);
  });

  it("still checks characters and headings for a pasted resume", () => {
    const checks = formattingChecks(null, resume("★ Led the team"));
    expect(checks.map((c) => [c.id, c.status])).toEqual([["special-characters", "warn"], ["section-heading-names", "warn"]]);
  });

  it("suggests a standard name for each creative heading", () => {
    const c = check("section-heading-names", {}, "# Ada\n\n## Where I've Been\n\n- Built Go services\n\n## My Toolbox\n\nGo");
    expect(c).toMatchObject({ status: "warn", fix: 'Rename "Where I\'ve Been" → "Work Experience", "My Toolbox" → "Skills".' });
  });

  it("fails tables, images, columns, and text boxes, with a fix for each", () => {
    for (const [id, facts] of [
      ["tables", { tables: 2 }],
      ["images", { images: 1 }],
      ["columns", { columns: 2 }],
      ["text-boxes", { textBoxes: 1 }],
    ] as const) {
      const c = check(id, facts);
      expect(c?.status, id).toBe("fail");
      expect(c?.fix, id).toBeTruthy();
    }
    expect(check("tables", { tables: 2 })?.detail).toContain("2 tables");
  });

  it("fails contact details in the header and warns on other header text", () => {
    const contact = check("header-footer", { headerText: "Ada Lovelace · ada@example.com · 415 555 0100" });
    expect(contact?.status).toBe("fail");
    expect(contact?.detail).toContain("email address and phone number are");
    expect(check("header-footer", { footerText: "Resume of Ada Lovelace" })?.status).toBe("warn");
  });

  it("warns on decorative fonts by name", () => {
    const c = check("fonts", { fonts: ["Calibri", "Lobster"] });
    expect(c?.status).toBe("warn");
    expect(c?.detail).toMatch(/^Lobster isn't a standard font/);
  });

  it("warns on unusual bullets and icon glyphs, listing each once", () => {
    const c = check("special-characters", { bulletChars: ["•", "➢"] }, "☎ 415 555 0100 · ✉ ada@example.com ☎");
    expect(c?.status).toBe("warn");
    expect(c?.detail).toMatch(/^➢ ☎ ✉ may not survive/);
  });

  it("does not flag ordinary punctuation or trademark signs", () => {
    expect(check("special-characters", {}, "Go · Rust | C++ — 40% © 2024 ™ → faster")?.status).toBe("pass");
  });
});
