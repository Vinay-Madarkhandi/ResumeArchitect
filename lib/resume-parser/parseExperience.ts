import { randomUUID } from "node:crypto";
import type { ResumeLine } from "./extractLines";
import { DATE_RANGE_RE, isSameVisualStyle, looksLikeBullet, looksLikeDateBoundary, stripBulletPrefix } from "./patterns";
import type { ExperienceEntry } from "@/lib/schemas/resume";

interface RawEntry {
  headerLines: ResumeLine[];
  bulletLines: ResumeLine[];
  hasDateLine: boolean;
}

function groupIntoRawEntries(lines: ResumeLine[]): RawEntry[] {
  const entries: RawEntry[] = [];
  let current: RawEntry | null = null;

  for (const line of lines) {
    const hasDate = DATE_RANGE_RE.test(line.text);
    const isBullet = looksLikeBullet(line.text);

    if (isBullet) {
      if (current) current.bulletLines.push(line);
      continue;
    }

    // A wrapped continuation of the last bullet shares its font size and
    // carries no date of its own — a date always signals a new entry's
    // header, even on the rare occasion its font happens to match.
    if (!looksLikeDateBoundary(line.text) && current && current.bulletLines.length > 0) {
      const lastBullet = current.bulletLines[current.bulletLines.length - 1];
      if (isSameVisualStyle(line, lastBullet)) {
        lastBullet.text += ` ${line.text}`;
        continue;
      }
    }

    const stillBuildingHeader = current !== null && current.bulletLines.length === 0;

    if (hasDate) {
      if (stillBuildingHeader && current && !current.hasDateLine) {
        current.headerLines.push(line);
        current.hasDateLine = true;
      } else {
        current = { headerLines: [line], bulletLines: [], hasDateLine: true };
        entries.push(current);
      }
      continue;
    }

    // Plain line, no date, no bullet glyph: another header line (role and
    // company often sit on separate lines) as long as bullets haven't
    // started yet; a font-mismatched plain line after bullets is a new entry.
    if (stillBuildingHeader && current) {
      current.headerLines.push(line);
    } else {
      current = { headerLines: [line], bulletLines: [], hasDateLine: false };
      entries.push(current);
    }
  }

  return entries;
}

/**
 * Splits a joined header ("Senior Engineer | Acme Corp") into role/company.
 * Tries common separators in order; falls back to putting the whole text in
 * `role` and flagging `company` for review rather than guessing which half
 * is which.
 */
function splitRoleAndCompany(headerText: string): { role: string; company: string; confident: boolean } {
  for (const sep of [" | ", " · ", " at ", ", "]) {
    const idx = headerText.indexOf(sep);
    if (idx > 0) {
      return {
        role: headerText.slice(0, idx).trim(),
        company: headerText.slice(idx + sep.length).trim(),
        confident: true,
      };
    }
  }
  return { role: headerText.trim(), company: "", confident: false };
}

export function parseExperienceSection(lines: ResumeLine[]): {
  experience: ExperienceEntry[];
  lowConfidenceFields: string[];
} {
  const lowConfidenceFields: string[] = [];
  const rawEntries = groupIntoRawEntries(lines);
  const experience: ExperienceEntry[] = [];

  rawEntries.forEach((raw, index) => {
    const headerText = raw.headerLines.map((l) => l.text).join(" ").replace(/\s+/g, " ").trim();
    const dateMatch = headerText.match(DATE_RANGE_RE);
    const withoutDate = dateMatch ? headerText.replace(dateMatch[0], "").trim() : headerText;
    const cleanedHeader = withoutDate.replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();

    const { role, company, confident } = splitRoleAndCompany(cleanedHeader);
    if (!confident) lowConfidenceFields.push(`experience[${index}].company`);
    if (!role) lowConfidenceFields.push(`experience[${index}].role`);

    const startDate = dateMatch?.[1];
    const endToken = dateMatch?.[2];
    const isCurrent = /present|current/i.test(endToken ?? "");
    if (!dateMatch) lowConfidenceFields.push(`experience[${index}].startDate`);

    const bullets = raw.bulletLines.map((l) => ({ id: randomUUID(), text: stripBulletPrefix(l.text) }));
    if (bullets.length === 0) lowConfidenceFields.push(`experience[${index}].bullets`);

    experience.push({
      id: randomUUID(),
      company,
      role: role || "Untitled role",
      startDate,
      endDate: isCurrent ? null : (endToken ?? null),
      isCurrent,
      bullets,
    });
  });

  return { experience, lowConfidenceFields };
}
