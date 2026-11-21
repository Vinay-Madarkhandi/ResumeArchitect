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

const WORKPLACE_RE = /\b(on-site|remote|hybrid)\b/i;
const CITY_STATE_RE = /\b[A-Z][a-zA-Z\s]+,\s*([A-Z]{2}\b|USA|UK|India|Canada|Germany)\b/i;

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

function parseExperienceHeader(rawLines: ResumeLine[]): {
  role: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate: string | null;
  isCurrent: boolean;
  confident: boolean;
} {
  const lineTexts = rawLines.map((l) => l.text.trim()).filter(Boolean);
  if (lineTexts.length === 0) {
    return { role: "Untitled role", company: "", endDate: null, isCurrent: false, confident: false };
  }

  let startDate: string | undefined;
  let endDate: string | null = null;
  let isCurrent = false;
  let dateText = "";

  for (const text of lineTexts) {
    const dateMatch = text.match(DATE_RANGE_RE);
    if (dateMatch && !startDate) {
      dateText = dateMatch[0];
      startDate = dateMatch[1];
      const endToken = dateMatch[2];
      isCurrent = /present|current/i.test(endToken ?? "");
      endDate = isCurrent ? null : (endToken ?? null);
      break;
    }
  }

  if (lineTexts.length === 1) {
    const withoutDate = dateText ? lineTexts[0].replace(dateText, "").trim() : lineTexts[0];
    const cleaned = withoutDate.replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();
    const { role, company, confident } = splitRoleAndCompany(cleaned);
    return { role: role || "Untitled role", company, startDate, endDate, isCurrent, confident };
  }

  let role = "";
  let company = "";
  let location: string | undefined;

  for (const text of lineTexts) {
    if (dateText && text.includes(dateText)) {
      const remainder = text.replace(dateText, "").replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();
      if (remainder) {
        const split = splitRoleAndCompany(remainder);
        if (split.confident && split.company) {
          role = split.role;
          company = split.company;
        } else {
          role = remainder;
        }
      }
    }
  }

  for (const text of lineTexts) {
    const clean = (dateText ? text.replace(dateText, "") : text).replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();
    if (!clean || clean === role) continue;

    const locMatch = clean.match(WORKPLACE_RE) || clean.match(CITY_STATE_RE);
    if (locMatch && !location) {
      location = locMatch[0].trim();
      const rest = clean.replace(locMatch[0], "").replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();
      if (rest && !company) {
        company = rest;
        continue;
      }
    }

    if (!company) {
      if (/\b(inc|corp|ltd|limited|llc|technologies|solutions|software|labs|group|studio|university|company)\b/i.test(clean) || !clean.includes(",")) {
        company = clean;
      }
    }
  }

  if (!company) {
    for (const text of lineTexts) {
      const clean = (dateText ? text.replace(dateText, "") : text).replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();
      if (clean && clean !== role) {
        company = clean;
        break;
      }
    }
  }

  return {
    role: role || "Untitled role",
    company,
    location,
    startDate,
    endDate,
    isCurrent,
    confident: Boolean(role && company),
  };
}

export function parseExperienceSection(lines: ResumeLine[]): {
  experience: ExperienceEntry[];
  lowConfidenceFields: string[];
} {
  const lowConfidenceFields: string[] = [];
  const rawEntries = groupIntoRawEntries(lines);
  const experience: ExperienceEntry[] = [];

  rawEntries.forEach((raw, index) => {
    const parsed = parseExperienceHeader(raw.headerLines);

    if (!parsed.confident) lowConfidenceFields.push(`experience[${index}].company`);
    if (!parsed.role || parsed.role === "Untitled role") lowConfidenceFields.push(`experience[${index}].role`);
    if (!parsed.startDate) lowConfidenceFields.push(`experience[${index}].startDate`);

    const bullets = raw.bulletLines.map((l) => ({ id: randomUUID(), text: stripBulletPrefix(l.text) }));
    if (bullets.length === 0) lowConfidenceFields.push(`experience[${index}].bullets`);

    experience.push({
      id: randomUUID(),
      company: parsed.company,
      role: parsed.role,
      location: parsed.location,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      isCurrent: parsed.isCurrent,
      bullets,
    });
  });

  return { experience, lowConfidenceFields };
}
