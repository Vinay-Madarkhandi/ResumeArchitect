/**
 * Typeset templates shared by the on-screen proof page, the PDF renderer,
 * and the DOCX writer, so all three agree on faces, sizes, and colors.
 * Sizes are in points.
 */
export type TemplateId = "classic" | "modern";

export interface Template {
  id: TemplateId;
  label: string;
  description: string;
  bodyFont: "Source Serif 4" | "Hanken Grotesk";
  headingFont: "Hanken Grotesk";
  /** Font name written into DOCX files, where embedded fonts aren't guaranteed. */
  docxBodyFont: string;
  docxHeadingFont: string;
  size: { name: number; section: number; entry: number; body: number };
  color: { ink: string; muted: string; accent: string; rule: string };
  sectionStyle: "rule" | "accent";
}

export const TEMPLATES: Record<TemplateId, Template> = {
  classic: {
    id: "classic",
    label: "Classic",
    description: "Serif body, ruled section headings. Reads like a printed CV.",
    bodyFont: "Source Serif 4",
    headingFont: "Hanken Grotesk",
    docxBodyFont: "Georgia",
    docxHeadingFont: "Calibri",
    size: { name: 22, section: 10.5, entry: 10, body: 9.75 },
    color: { ink: "#1d1b18", muted: "#5b5750", accent: "#1d1b18", rule: "#c9c3b8" },
    sectionStyle: "rule",
  },
  modern: {
    id: "modern",
    label: "Modern",
    description: "One clean sans throughout, bronze section labels.",
    bodyFont: "Hanken Grotesk",
    headingFont: "Hanken Grotesk",
    docxBodyFont: "Calibri",
    docxHeadingFont: "Calibri",
    size: { name: 24, section: 9.5, entry: 10, body: 9.5 },
    color: { ink: "#18191b", muted: "#55585e", accent: "#8a6420", rule: "#e2ddd3" },
    sectionStyle: "accent",
  },
};

export function getTemplate(id: string | null | undefined): Template {
  return id === "modern" ? TEMPLATES.modern : TEMPLATES.classic;
}
