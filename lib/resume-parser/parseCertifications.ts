import { randomUUID } from "node:crypto";
import type { ResumeLine } from "./extractLines";
import { DATE_SINGLE_RE, stripBulletPrefix, URL_RE } from "./patterns";
import type { Certification } from "@/lib/schemas/resume";

const YEAR_RE = /\b(19|20)\d{2}\b/;

export function parseCertificationsSection(lines: ResumeLine[]): {
  certifications: Certification[];
  lowConfidenceFields: string[];
} {
  const lowConfidenceFields: string[] = [];

  const certifications: Certification[] = lines
    .map((line) => stripBulletPrefix(line.text))
    .filter(Boolean)
    .map((text, index) => {
      const urlMatch = text.match(URL_RE);
      let remaining = urlMatch ? text.replace(urlMatch[0], "").trim() : text;

      const yearMatch = remaining.match(YEAR_RE);
      const dateToken = remaining
        .split(/[,\-–—|]/)
        .map((s) => s.trim())
        .find((s) => DATE_SINGLE_RE.test(s) || (yearMatch && s.includes(yearMatch[0])));
      if (dateToken) remaining = remaining.replace(dateToken, "").trim();
      remaining = remaining.replace(/[|,\-–—]+$/, "").replace(/^[|,\-–—]+/, "").trim();

      const parts = remaining.split(/\s*[|,\-–—]\s*/).filter(Boolean);
      const name = parts[0] ?? remaining;
      const issuer = parts.slice(1).join(", ") || undefined;
      if (!issuer) lowConfidenceFields.push(`certifications[${index}].issuer`);

      return {
        id: randomUUID(),
        name: name || "Untitled certification",
        issuer,
        date: dateToken,
        url: urlMatch?.[0],
      };
    });

  return { certifications, lowConfidenceFields };
}
