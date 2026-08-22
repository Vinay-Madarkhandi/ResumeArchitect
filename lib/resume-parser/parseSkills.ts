import { randomUUID } from "node:crypto";
import type { ResumeLine } from "./extractLines";
import { looksLikeBullet, stripBulletPrefix } from "./patterns";
import type { SkillGroup } from "@/lib/schemas/resume";

const CATEGORY_LINE_RE = /^([A-Za-z][A-Za-z &/]{1,30}):\s*(.+)$/;

export function parseSkillsSection(lines: ResumeLine[]): {
  skills: SkillGroup[];
  lowConfidenceFields: string[];
} {
  const groups: SkillGroup[] = [];
  const ungrouped: string[] = [];

  for (const line of lines) {
    const text = stripBulletPrefix(line.text);
    const categoryMatch = text.match(CATEGORY_LINE_RE);
    if (categoryMatch) {
      const items = categoryMatch[2].split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
      groups.push({ id: randomUUID(), category: categoryMatch[1].trim(), items });
    } else if (looksLikeBullet(line.text) || text.includes(",") || text.includes(";")) {
      ungrouped.push(...text.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
    } else if (text) {
      ungrouped.push(text);
    }
  }

  if (ungrouped.length > 0) {
    groups.push({ id: randomUUID(), category: "Skills", items: ungrouped });
  }

  const lowConfidenceFields = groups.length === 0 ? ["skills"] : [];
  return { skills: groups, lowConfidenceFields };
}
