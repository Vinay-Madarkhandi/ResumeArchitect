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

export const RESUME_PAGE = { width: 595.28, height: 841.89 };
export const RESUME_SPACING = {
  nameAfter: 4, nameLine: 1.15, sectionAfter: 4, sectionRulePad: 2.5, sectionRule: 0.75,
  entryBefore: 5, entryAfter: 1.2, paragraphAfter: 3, bulletAfter: 1.8, bulletIndent: 13,
};

/** The two embedded faces: Source Serif 4 and Hanken Grotesk. */
export type Face = "serif" | "sans";

export interface Template {
  id: TemplateId;
  label: string;
  description: string;
  body: Face;
  heading: Face;
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
    description: "Centered serif header, ruled section headings. Reads like a printed CV.",
    body: "serif",
    heading: "serif",
    size: { name: 24, section: 11, entry: 10, body: 9.75 },
    space: { marginX: 36, marginY: 30, section: 8, line: 1.25 },
    color: { ink: "#000000", muted: "#3a3a3a", accent: "#000000", rule: "#000000" },
    sectionStyle: "rule",
    header: "center",
    sectionCase: "asis",
  },
  modern: {
    id: "modern",
    label: "Modern",
    description: "One clean sans throughout, bronze section labels.",
    body: "sans",
    heading: "sans",
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

/** The family name used for embedded PDF and Word fonts. */
export const resumeFontFamily = (face: Face) => (face === "serif" ? "Source Serif 4" : "Hanken Grotesk");

/** The heaviest weight embedded for a face: 700 bold. */
export const boldWeight = (_face: Face) => 700;

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
    "--paper-body-weight": boldWeight(t.body),
    "--paper-accent": t.sectionStyle === "accent" ? t.color.accent : "var(--paper-ink)",
    "--paper-fs": px(t.size.body),
    "--paper-fs-name": px(t.size.name),
    "--paper-fs-section": px(t.size.section),
    "--paper-fs-entry": px(t.size.entry),
    "--paper-line": t.space.line,
    "--paper-pad-x": px(t.space.marginX),
    "--paper-pad-y": px(t.space.marginY),
    "--paper-space-section": px(t.space.section),
    "--paper-name-after": px(RESUME_SPACING.nameAfter),
    "--paper-name-line": RESUME_SPACING.nameLine,
    "--paper-section-after": px(RESUME_SPACING.sectionAfter),
    "--paper-entry-before": px(RESUME_SPACING.entryBefore),
    "--paper-entry-after": px(RESUME_SPACING.entryAfter),
    "--paper-paragraph-after": px(RESUME_SPACING.paragraphAfter),
    "--paper-bullet-after": px(RESUME_SPACING.bulletAfter),
    "--paper-bullet-indent": px(RESUME_SPACING.bulletIndent),
    "--paper-rule": t.color.rule,
    "--paper-h2-rule": t.sectionStyle === "rule" ? `${px(RESUME_SPACING.sectionRule)} solid ${t.color.rule}` : "0",
    "--paper-h2-pad": t.sectionStyle === "rule" ? px(RESUME_SPACING.sectionRulePad) : "0",
    "--paper-h2-case": t.sectionCase === "upper" ? "uppercase" : "none",
    "--paper-header-align": t.header === "center" ? "center" : "left",
  } as CSSProperties;
}
