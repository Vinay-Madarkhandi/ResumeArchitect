import { randomUUID } from "node:crypto";
import type { ResumeLine } from "./extractLines";
import { DATE_RANGE_RE, isSameVisualStyle, looksLikeBullet, looksLikeDateBoundary, stripBulletPrefix } from "./patterns";
import type { EducationEntry } from "@/lib/schemas/resume";

// Supports both the US 4.0 scale and the 10-point scale common outside the
// US (e.g. "GPA: 7.94/10", "CGPA: 8.5"), capturing the denominator too so it
// isn't lost or mistaken for a 4.0-scale score.
const GPA_RE = /(?:CGPA|GPA)\s*:?\s*(\d{1,2}(?:\.\d{1,2})?)(?:\s*\/\s*(\d{1,2}(?:\.\d{1,2})?))?/i;

interface RawEducation {
  headerLines: ResumeLine[];
  honorLines: ResumeLine[];
  hasDateLine: boolean;
}

function groupEntries(lines: ResumeLine[]): RawEducation[] {
  const entries: RawEducation[] = [];
  let current: RawEducation | null = null;

  for (const line of lines) {
    const isBullet = looksLikeBullet(line.text);
    const hasDate = DATE_RANGE_RE.test(line.text);
    const isGpaLine = GPA_RE.test(line.text);

    if (isBullet) {
      if (current) current.honorLines.push(line);
      continue;
    }

    // A GPA line is always a trailing detail of the current entry, never the
    // start of a new one, however far along that entry already is.
    if (isGpaLine && current) {
      current.headerLines.push(line);
      continue;
    }

    // A wrapped continuation of the last honor line shares its font size and
    // carries no date of its own — a date always signals a new entry's
    // header, even on the rare occasion its font happens to match.
    if (!looksLikeDateBoundary(line.text) && current && current.honorLines.length > 0) {
      const lastHonor = current.honorLines[current.honorLines.length - 1];
      if (isSameVisualStyle(line, lastHonor)) {
        lastHonor.text += ` ${line.text}`;
        continue;
      }
    }

    const stillBuildingHeader = current !== null && current.honorLines.length === 0;

    if (hasDate) {
      if (stillBuildingHeader && current && !current.hasDateLine) {
        current.headerLines.push(line);
        current.hasDateLine = true;
      } else {
        current = { headerLines: [line], honorLines: [], hasDateLine: true };
        entries.push(current);
      }
      continue;
    }

    if (stillBuildingHeader && current) {
      current.headerLines.push(line);
    } else {
      current = { headerLines: [line], honorLines: [], hasDateLine: false };
      entries.push(current);
    }
  }

  return entries;
}

export function parseEducationSection(lines: ResumeLine[]): {
  education: EducationEntry[];
  lowConfidenceFields: string[];
} {
  const lowConfidenceFields: string[] = [];
  const raw = groupEntries(lines);

  const education: EducationEntry[] = raw.map((entry, index) => {
    // GPA and the date range can land on either header line once joined, but
    // institution/degree splitting stays line-based: many resumes put the
    // institution and degree on two separate lines with no "|" or ","
    // between them, so a single joined string has no delimiter to split on.
    const combinedText = entry.headerLines.map((l) => l.text).join(" ").replace(/\s+/g, " ").trim();

    const gpaMatch = combinedText.match(GPA_RE);
    const gpa = gpaMatch ? (gpaMatch[2] ? `${gpaMatch[1]}/${gpaMatch[2]}` : gpaMatch[1]) : undefined;

    const dateMatch = combinedText.match(DATE_RANGE_RE);

    const cleanLine = (text: string) =>
      text
        .replace(gpaMatch ? gpaMatch[0] : "", "")
        .replace(dateMatch ? dateMatch[0] : "", "")
        .replace(/[|,\-–—]+$/, "")
        .replace(/^[|,\-–—]+/, "")
        .trim();

    const cleanedLines = entry.headerLines.map((l) => cleanLine(l.text)).filter(Boolean);

    let institution: string;
    let degree: string | undefined;

    if (cleanedLines.length >= 2) {
      institution = cleanedLines[0];
      degree = cleanedLines.slice(1).join(", ");
    } else {
      const parts = (cleanedLines[0] ?? "").split(/\s*[|,]\s*/).filter(Boolean);
      institution = parts[0] ?? "";
      degree = parts.slice(1).join(", ") || undefined;
      if (parts.length < 2) lowConfidenceFields.push(`education[${index}].degree`);
    }

    if (!institution) lowConfidenceFields.push(`education[${index}].institution`);

    const honors = entry.honorLines.map((l) => stripBulletPrefix(l.text));

    return {
      id: randomUUID(),
      institution: institution || "Unknown institution",
      degree,
      startDate: dateMatch?.[1],
      endDate: dateMatch?.[2],
      gpa,
      honors,
    };
  });

  return { education, lowConfidenceFields };
}
