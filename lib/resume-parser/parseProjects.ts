import { randomUUID } from "node:crypto";
import type { ResumeLine } from "./extractLines";
import { DATE_RANGE_RE, looksLikeBullet, stripBulletPrefix, URL_RE } from "./patterns";
import type { ProjectEntry } from "@/lib/schemas/resume";

const TECH_LINE_RE = /^(Technologies|Tech Stack|Built with|Stack|Tools)\s*:\s*(.+)$/i;

interface RawProject {
  nameLine?: ResumeLine;
  descriptionLines: ResumeLine[];
  bulletLines: ResumeLine[];
  technologies: string[];
  url?: string;
}

export function parseProjectsSection(lines: ResumeLine[]): {
  projects: ProjectEntry[];
  lowConfidenceFields: string[];
} {
  const lowConfidenceFields: string[] = [];
  const raw: RawProject[] = [];
  let current: RawProject | null = null;

  for (const line of lines) {
    const isBullet = looksLikeBullet(line.text);
    const techMatch = line.text.match(TECH_LINE_RE);
    const urlMatch = line.text.match(URL_RE);

    if (isBullet) {
      if (!current) {
        current = { descriptionLines: [], bulletLines: [], technologies: [] };
        raw.push(current);
      }
      current.bulletLines.push(line);
      continue;
    }

    if (techMatch) {
      if (!current) {
        current = { descriptionLines: [], bulletLines: [], technologies: [] };
        raw.push(current);
      }
      current.technologies.push(...techMatch[2].split(/[,;|]/).map((s) => s.trim()).filter(Boolean));
      continue;
    }

    // A new project starts at a plain (non-bullet, non-tech-line) line once
    // the current one already has content, or there is no current project yet.
    if (!current || current.bulletLines.length > 0 || current.nameLine) {
      current = { descriptionLines: [], bulletLines: [], technologies: [] };
      raw.push(current);
    }

    if (!current.nameLine) {
      current.nameLine = line;
      if (urlMatch) current.url = urlMatch[0];
    } else {
      current.descriptionLines.push(line);
    }
  }

  const projects: ProjectEntry[] = raw
    .filter((p) => p.nameLine || p.bulletLines.length > 0)
    .map((p, index) => {
      const nameText = p.nameLine?.text ?? "Untitled project";
      const withoutDate = nameText.replace(DATE_RANGE_RE, "").trim();
      const name = withoutDate.replace(/[|,\-–—]+$/, "").trim() || "Untitled project";
      if (!p.nameLine) lowConfidenceFields.push(`projects[${index}].name`);

      const bullets = p.bulletLines.map((l) => ({ id: randomUUID(), text: stripBulletPrefix(l.text) }));
      const description = p.descriptionLines.map((l) => l.text).join(" ").trim() || undefined;

      return {
        id: randomUUID(),
        name,
        description,
        url: p.url,
        technologies: p.technologies,
        bullets,
      };
    });

  return { projects, lowConfidenceFields };
}
