import type { BlockNode, DocumentContent, InlineNode } from "@/lib/schemas/document";

export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

/**
 * ATS-compliance checks — entirely deterministic, no AI involved, because
 * there's no need for a model's judgment on questions that have a real
 * factual answer: is a name present, is there contact info, do standard
 * section headers exist, is the length reasonable, is the layout itself
 * ATS-safe. Runs client-side against the live document, instantly, no
 * network round-trip.
 */

function inlineText(nodes: InlineNode[]): string {
  return nodes.map((n) => (n.type === "text" ? n.text : "")).join("");
}

function collectText(blocks: BlockNode[]): string {
  let out = "";
  for (const block of blocks) {
    if (block.type === "heading" || block.type === "paragraph") {
      out += inlineText(block.content) + " ";
    } else {
      for (const item of block.content) {
        out += collectText(item.content) + " ";
      }
    }
  }
  return out;
}

function headingTexts(blocks: BlockNode[], level: number): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    if (block.type === "heading" && block.attrs.level === level) {
      out.push(inlineText(block.content));
    } else if (block.type === "bulletList" || block.type === "orderedList") {
      for (const item of block.content) out.push(...headingTexts(item.content, level));
    }
  }
  return out;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const STANDARD_SECTIONS = ["experience", "education", "skills"];

export function validateAts(doc: DocumentContent): AtsCheck[] {
  const text = collectText(doc.content);
  const h1s = headingTexts(doc.content, 1);
  const h2s = headingTexts(doc.content, 2).map((h) => h.toLowerCase());
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const hasName = h1s.length > 0 && h1s[0].trim().length > 0;
  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);
  const foundSections = STANDARD_SECTIONS.filter((keyword) => h2s.some((h) => h.includes(keyword)));

  return [
    {
      id: "name",
      label: "Name is present",
      passed: hasName,
      detail: hasName
        ? `Found "${h1s[0]}" as the top-level heading.`
        : "No top-level heading was found — most ATS parsers expect the candidate's name as the first line.",
    },
    {
      id: "contact",
      label: "Contact info is present",
      passed: hasEmail || hasPhone,
      detail:
        hasEmail && hasPhone
          ? "Found both an email address and a phone number."
          : hasEmail
            ? "Found an email address, but no phone number."
            : hasPhone
              ? "Found a phone number, but no email address."
              : "No email address or phone number was found in the document.",
    },
    {
      id: "sections",
      label: "Standard section headers",
      passed: foundSections.length >= 2,
      detail:
        foundSections.length > 0
          ? `Found: ${foundSections.join(", ")}. ATS parsers look for standard headers like "Experience," "Education," and "Skills" — a custom header (e.g. "My Journey") may not be recognized.`
          : `None of "Experience," "Education," or "Skills" were found as section headers — a custom header (e.g. "My Journey") may not be recognized by ATS parsers.`,
    },
    {
      id: "length",
      label: "Reasonable length",
      passed: wordCount >= 80 && wordCount <= 1200,
      detail:
        wordCount < 80
          ? `Only ${wordCount} words — likely too sparse for an ATS parser to extract much from.`
          : wordCount > 1200
            ? `${wordCount} words — on the long side; consider trimming to keep it scannable.`
            : `${wordCount} words — a reasonable length.`,
    },
    {
      id: "structure",
      label: "Single-column, text-based layout",
      passed: true,
      detail:
        "This resume is built and exported as a single-column text document — no tables, images, or multi-column layouts, which are the most common reasons an ATS parser garbles a resume.",
    },
  ];
}
