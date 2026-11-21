import { type TemplateId } from "./templates";
import type { ResumeFileFacts } from "@/lib/report/report";

/**
 * Detects the closest ATS-safe resume template based on extracted document facts.
 * - Serif fonts (Times New Roman, Georgia, Garamond, Computer Modern) -> "classic" (LaTeX SWE CV style)
 * - Sans fonts with standard layout -> "standard" or "compact"
 */
export function detectResumeTemplate(facts: ResumeFileFacts | null | undefined): TemplateId {
  if (!facts || (facts.format !== "pdf" && facts.format !== "docx")) return "classic";

  const fonts: string[] = facts.fonts || [];
  const fontsLower: string[] = fonts.map((f: string) => f.toLowerCase());

  const isSerif = fontsLower.some((f: string) =>
    /times|georgia|garamond|cambria|palatino|serif|cmu|latin modern|baskerville|didot|minion|merriweather|bookman|charter/.test(f),
  );

  const isSans = fontsLower.some((f: string) =>
    /arial|calibri|helvetica|roboto|inter|segoe|trebuchet|sans|hanken|verdana|tahoma|open sans|lato/.test(f),
  );

  if (isSerif) {
    return "classic";
  }

  if (isSans) {
    return "standard";
  }

  return "classic";
}
