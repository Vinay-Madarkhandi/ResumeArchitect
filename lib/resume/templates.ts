import type { CSSProperties } from "react";

/**
 * Typeset templates shared by the on-screen proof page, the PDF renderer,
 * and the DOCX writer. Every measurement lives here, so the three outputs
 * read the same numbers. Sizes and spacing are in points.
 *
 * All templates are ATS-safe by construction: one column, real text,
 * standard bullets, no tables, text boxes, headers or footers, and section
 * headings set exactly as the user wrote them (optionally in capitals).
 */
export const TEMPLATE_IDS = ["classic", "modern", "standard", "executive", "compact"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** The two embedded faces: Source Serif 4 and Hanken Grotesk. */
export type Face = "serif" | "sans";

export interface Template {
  id: TemplateId;
  label: string;
  description: string;
  body: Face;
  heading: Face;
  /** Font names written into DOCX files, where embedded fonts aren't guaranteed. */
  docxBodyFont: string;
  docxHeadingFont: string;
  size: { name: number; section: number; entry: number; body: number };
  /** Page margins, the gap above a section heading, and the body line height (a multiple). */
  space: { marginX: number; marginY: number; section: number; line: number };
  color: { ink: string; muted: string; accent: string; rule: string };
  sectionStyle: "rule" | "accent";
  /** Name and the contact line under it: flush left, or centered. */
  header: "left" | "center";
  /** Section headings set in capitals, or as written. */
  sectionCase: "upper" | "asis";
}

export const TEMPLATES: Record<TemplateId, Template> = {
  classic: {
    id: "classic",
    label: "Classic",
    description: "Serif body, ruled section headings. Reads like a printed CV.",
    body: "serif",
    heading: "sans",
    docxBodyFont: "Georgia",
    docxHeadingFont: "Calibri",
    size: { name: 22, section: 10.5, entry: 10, body: 9.75 },
    space: { marginX: 46, marginY: 42, section: 13, line: 1.42 },
    color: { ink: "#1d1b18", muted: "#5b5750", accent: "#1d1b18", rule: "#c9c3b8" },
    sectionStyle: "rule",
    header: "left",
    sectionCase: "upper",
  },
  modern: {
    id: "modern",
    label: "Modern",
    description: "One clean sans throughout, bronze section labels.",
    body: "sans",
    heading: "sans",
    docxBodyFont: "Calibri",
    docxHeadingFont: "Calibri",
    size: { name: 24, section: 9.5, entry: 10, body: 9.5 },
    space: { marginX: 46, marginY: 42, section: 14, line: 1.42 },
    color: { ink: "#18191b", muted: "#55585e", accent: "#8a6420", rule: "#e2ddd3" },
    sectionStyle: "accent",
    header: "left",
    sectionCase: "upper",
  },
  standard: {
    id: "standard",
    label: "Standard",
    description: "Centered name, plain sans, ruled headings. Like a well-made Word resume.",
    body: "sans",
    heading: "sans",
    docxBodyFont: "Calibri",
    docxHeadingFont: "Calibri",
    size: { name: 20, section: 11.5, entry: 10, body: 9.5 },
    space: { marginX: 46, marginY: 42, section: 13, line: 1.42 },
    color: { ink: "#111111", muted: "#4a4a4a", accent: "#111111", rule: "#9a9a9a" },
    sectionStyle: "rule",
    header: "center",
    sectionCase: "asis",
  },
  executive: {
    id: "executive",
    label: "Executive",
    description: "Serif throughout, centered name, generous spacing. Quietly formal.",
    body: "serif",
    heading: "serif",
    docxBodyFont: "Georgia",
    docxHeadingFont: "Georgia",
    size: { name: 23, section: 11, entry: 10.5, body: 10 },
    space: { marginX: 54, marginY: 48, section: 15, line: 1.45 },
    color: { ink: "#1a1a1a", muted: "#555555", accent: "#1a1a1a", rule: "#b8b8b8" },
    sectionStyle: "rule",
    header: "center",
    sectionCase: "upper",
  },
  compact: {
    id: "compact",
    label: "Compact",
    description: "Tight sans with slim margins. Fits a long career on one page.",
    body: "sans",
    heading: "sans",
    docxBodyFont: "Arial",
    docxHeadingFont: "Arial",
    size: { name: 18, section: 10, entry: 9.5, body: 9 },
    space: { marginX: 36, marginY: 32, section: 9, line: 1.3 },
    color: { ink: "#141414", muted: "#505050", accent: "#141414", rule: "#a8a8a8" },
    sectionStyle: "rule",
    header: "left",
    sectionCase: "asis",
  },
};

export const TEMPLATE_LIST: Template[] = TEMPLATE_IDS.map((id) => TEMPLATES[id]);

export function isTemplateId(id: unknown): id is TemplateId {
  return typeof id === "string" && (TEMPLATE_IDS as readonly string[]).includes(id);
}

export function getTemplate(id: string | null | undefined): Template {
  return isTemplateId(id) ? TEMPLATES[id] : TEMPLATES.classic;
}

/** The PDF font family for a face, as registered in lib/pdf/fonts.ts. */
export const pdfFamily = (face: Face) => (face === "serif" ? "Source Serif 4" : "Hanken Grotesk");

/** The heaviest weight embedded for a face: Source Serif 4 ships up to SemiBold. */
export const boldWeight = (face: Face) => (face === "serif" ? 600 : 700);

/** The proof page is A4 at 96 dpi (794 px wide), where one point is exactly 4/3 px. */
const px = (pt: number) => `${Math.round(pt * (4 / 3) * 100) / 100}px`;
const cssFace = (face: Face) => (face === "serif" ? "var(--font-paper-serif)" : "var(--font-paper-sans)");

/**
 * The template as CSS custom properties for `.paper` (app/globals.css), so the
 * on-screen page uses the same measurements as the PDF. Ink stays the theme's
 * dimmed paper ink for eye comfort; an accent template keeps its accent.
 */
export function templateStyle(t: Template): CSSProperties {
  return {
    "--paper-body": cssFace(t.body),
    "--paper-head": cssFace(t.heading),
    "--paper-head-weight": boldWeight(t.heading),
    "--paper-accent": t.sectionStyle === "accent" ? t.color.accent : "var(--paper-ink)",
    "--paper-fs": px(t.size.body),
    "--paper-fs-name": px(t.size.name),
    "--paper-fs-section": px(t.size.section),
    "--paper-fs-entry": px(t.size.entry),
    "--paper-line": t.space.line,
    "--paper-pad-x": px(t.space.marginX),
    "--paper-pad-y": px(t.space.marginY),
    "--paper-space-section": px(t.space.section),
    "--paper-h2-rule": t.sectionStyle === "rule" ? "1px solid var(--paper-rule)" : "0",
    "--paper-h2-pad": t.sectionStyle === "rule" ? "4px" : "0",
    "--paper-h2-case": t.sectionCase === "upper" ? "uppercase" : "none",
    "--paper-header-align": t.header === "center" ? "center" : "left",
  } as CSSProperties;
}
