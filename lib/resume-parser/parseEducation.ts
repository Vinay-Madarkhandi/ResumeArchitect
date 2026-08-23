import { randomUUID } from "node:crypto";
import type { ResumeLine } from "./extractLines";
import { DATE_RANGE_RE, looksLikeBullet, stripBulletPrefix } from "./patterns";
import type { EducationEntry } from "@/lib/schemas/resume";

const GPA_RE = /GPA:?\s*([0-4]\.\d{1,2})(?:\s*\/\s*[0-4]\.\d{1,2})?/i;

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
    if (hasDate) {
      if (current && current.honorLines.length === 0 && !current.hasDateLine) {
        current.headerLines.push(line);
        current.hasDateLine = true;
      } else {
        current = { headerLines: [line], honorLines: [], hasDateLine: true };
        entries.push(current);
      }
      continue;
    }
    // A GPA line is always a trailing detail of the current entry, never the
    // start of a new one, however far along that entry already is.
    if (isGpaLine && current) {
      current.headerLines.push(line);
      continue;
    }
    if (current && current.honorLines.length === 0 && !current.hasDateLine) {
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
    let headerText = entry.headerLines.map((l) => l.text).join(" ").replace(/\s+/g, " ").trim();

    const gpaMatch = headerText.match(GPA_RE);
    const gpa = gpaMatch?.[1];
    if (gpaMatch) headerText = headerText.replace(gpaMatch[0], "").trim();

    const dateMatch = headerText.match(DATE_RANGE_RE);
    if (dateMatch) headerText = headerText.replace(dateMatch[0], "").trim();
    headerText = headerText.replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();

    const parts = headerText.split(/\s*[|,]\s*/).filter(Boolean);
    const institution = parts[0] ?? "";
    const degree = parts.slice(1).join(", ") || undefined;
    if (!institution) lowConfidenceFields.push(`education[${index}].institution`);
    if (parts.length < 2) lowConfidenceFields.push(`education[${index}].degree`);

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
