import type { ResumeContent } from "@/lib/schemas/resume";
import type {
  BlockNode,
  BulletListNode,
  DocumentContent,
  HeadingNode,
  InlineNode,
  ListItemNode,
  ParagraphNode,
  TextNode,
} from "@/lib/schemas/document";

/**
 * Builds an initial freeform document from reviewed, structured resume data.
 * Called exactly twice: once when onboarding review is confirmed
 * (finalizeMasterResume), and once — lazily — the first time an old-shape
 * resume is opened in the editor, so it upgrades to the new document format
 * without a batch migration. After this point the document is fully
 * freeform; this function is only ever the starting point, never re-run
 * against a resume the user has already edited as a document.
 */
export function resumeContentToDoc(content: ResumeContent): DocumentContent {
  const blocks: BlockNode[] = [];

  blocks.push(heading(1, [text(content.personalInfo.fullName || "Untitled")]));

  if (content.personalInfo.headline) {
    blocks.push(paragraph([text(content.personalInfo.headline, ["italic"])]));
  }

  const contactParts = [
    content.personalInfo.location,
    content.personalInfo.email,
    content.personalInfo.phone,
    ...content.personalInfo.links.map((l) => l.label || l.url),
  ].filter((part): part is string => Boolean(part && part.trim()));
  if (contactParts.length > 0) {
    blocks.push(paragraph([text(contactParts.join("   •   "))]));
  }

  if (content.summary && content.summary.trim()) {
    blocks.push(heading(2, [text("Summary")]));
    blocks.push(paragraph([text(content.summary)]));
  }

  if (content.experience.length > 0) {
    blocks.push(heading(2, [text("Experience")]));
    for (const entry of content.experience) {
      const titleLine = [entry.role, entry.company].filter(Boolean).join(" — ");
      blocks.push(heading(3, [text(titleLine || entry.company || entry.role || "Untitled role")]));

      const dateRange = formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);
      const metaParts = [entry.location, dateRange].filter((p): p is string => Boolean(p));
      if (metaParts.length > 0) {
        blocks.push(paragraph([text(metaParts.join("   •   "), ["italic"])]));
      }

      if (entry.bullets.length > 0) {
        blocks.push(bulletList(entry.bullets.map((b) => listItem(b.text))));
      }
    }
  }

  if (content.projects.length > 0) {
    blocks.push(heading(2, [text("Projects")]));
    for (const entry of content.projects) {
      const nameNode = entry.url ? text(entry.name, ["link"], entry.url) : text(entry.name);
      blocks.push(heading(3, [nameNode]));

      const metaParts = [entry.description, entry.technologies.length > 0 ? entry.technologies.join(", ") : undefined].filter(
        (p): p is string => Boolean(p),
      );
      if (metaParts.length > 0) {
        blocks.push(paragraph([text(metaParts.join(" — "), ["italic"])]));
      }

      if (entry.bullets.length > 0) {
        blocks.push(bulletList(entry.bullets.map((b) => listItem(b.text))));
      }
    }
  }

  if (content.education.length > 0) {
    blocks.push(heading(2, [text("Education")]));
    for (const entry of content.education) {
      blocks.push(heading(3, [text(entry.institution || "Untitled institution")]));

      const degreeLine = [entry.degree, entry.fieldOfStudy].filter(Boolean).join(", ");
      const dateRange = formatDateRange(entry.startDate, entry.endDate, false);
      const gpaLine = entry.gpa ? `GPA: ${entry.gpa}` : undefined;
      const metaParts = [degreeLine, dateRange, gpaLine].filter((p): p is string => Boolean(p));
      if (metaParts.length > 0) {
        blocks.push(paragraph([text(metaParts.join("   •   "), ["italic"])]));
      }

      if (entry.honors.length > 0) {
        blocks.push(bulletList(entry.honors.map((h) => listItem(h))));
      }
    }
  }

  if (content.skills.length > 0) {
    blocks.push(heading(2, [text("Skills")]));
    for (const group of content.skills) {
      if (group.items.length === 0) continue;
      blocks.push(paragraph([text(`${group.category}: `, ["bold"]), text(group.items.join(", "))]));
    }
  }

  if (content.certifications.length > 0) {
    blocks.push(heading(2, [text("Certifications")]));
    for (const cert of content.certifications) {
      const metaParts = [cert.issuer, cert.date].filter((p): p is string => Boolean(p));
      const label = metaParts.length > 0 ? `${cert.name} — ${metaParts.join(", ")}` : cert.name;
      const node = cert.url ? text(label, ["link"], cert.url) : text(label);
      blocks.push(paragraph([node]));
    }
  }

  if (blocks.length === 0) {
    blocks.push(paragraph([]));
  }

  return { type: "doc", content: blocks };
}

function formatDateRange(startDate: string | undefined, endDate: string | null | undefined, isCurrent: boolean): string | undefined {
  if (!startDate && !endDate && !isCurrent) return undefined;
  const end = isCurrent ? "Present" : endDate || undefined;
  if (startDate && end) return `${startDate} – ${end}`;
  return startDate || end;
}

type MarkKind = "bold" | "italic" | "link";

function text(value: string, marks: MarkKind[] = [], href?: string): TextNode {
  if (!marks.length) return { type: "text", text: value };
  return {
    type: "text",
    text: value,
    marks: marks.map((kind) => (kind === "link" ? { type: "link", attrs: { href: href ?? "" } } : { type: kind })),
  };
}

function paragraph(content: InlineNode[]): ParagraphNode {
  return { type: "paragraph", content };
}

function heading(level: 1 | 2 | 3, content: InlineNode[]): HeadingNode {
  return { type: "heading", attrs: { level }, content };
}

function listItem(textValue: string): ListItemNode {
  return { type: "listItem", content: [paragraph([text(textValue)])] };
}

function bulletList(items: ListItemNode[]): BulletListNode {
  return { type: "bulletList", content: items };
}
