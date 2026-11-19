import { geminiModel } from "@/lib/gemini/model";
import { parseResume } from "@/lib/gemini/prompts/parseResume";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { readWithinBudget } from "@/lib/report/inspectBudget";
import { MAX_UPLOAD_BYTES } from "@/lib/report/inspectLimits";
import type { ResumeFileFacts } from "@/lib/report/report";
import type { ExtractedResume } from "@/lib/resume/extract";
import type { DocumentContent } from "@/lib/schemas/document";

export class ImportError extends Error {}

export type SourceKind = "pdf" | "docx" | "text";

/** A resume as long as anyone writes, in characters; pasted or uploaded text past it isn't a resume. */
export const MAX_RESUME_CHARS = 40_000;
/** A multipart upload: the file plus the other form fields. */
export const MAX_UPLOAD_FORM_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024;

export function detectKind(file: File): SourceKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) return "text";
  return null;
}

const UNREADABLE: Record<SourceKind, string> = {
  pdf: "This PDF couldn't be read. It may be password-protected or damaged.",
  docx: "This file couldn't be read. Try exporting it again, or paste the text instead.",
  text: "This file couldn't be read. Try exporting it again, or paste the text instead.",
};

/**
 * Reads an uploaded resume file. PDF and Word files are inspected and read
 * inside the budgeted file worker (lib/report/inspectBudget.ts); one that is
 * over a budget or unreadable is refused before anything else happens.
 * Layout facts are null for a plain-text file.
 */
export async function readResumeUpload(file: File): Promise<{ kind: SourceKind; facts: ResumeFileFacts | null; resume: ExtractedResume }> {
  const kind = detectKind(file);
  if (!kind) throw new ImportError("Upload a PDF, Word (.docx), or text file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new ImportError("That file is over 8 MB. Upload a smaller one.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (kind === "text") {
    const text = new TextDecoder().decode(bytes);
    if (text.length > MAX_RESUME_CHARS) throw new ImportError("That's longer than a resume. Upload just your resume.");
    return { kind, facts: null, resume: { source: "text", text, parsed: null } };
  }
  const { facts, resume } = await readWithinBudget(kind, bytes);
  if (facts.format === "invalid" && facts.reason === "too-large") {
    throw new ImportError("That file is too large or complex to read. Save a simpler copy, or paste the text instead.");
  }
  if (facts.format === "invalid" || !resume) throw new ImportError(UNREADABLE[kind]);
  return { kind, facts, resume };
}

/** Without AI: one paragraph per line, with short all-caps or title lines promoted to headings. */
export function plainTextToDocument(text: string): DocumentContent {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const md = lines
    .map((line, i) => {
      if (i === 0 && line.split(/\s+/).length <= 5) return `# ${line}`;
      if (/^[•\-*▪◦‣·○]\s*/.test(line)) return `- ${line.replace(/^[•\-*▪◦‣·○]\s*/, "")}`;
      if (line.length <= 30 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
        return `## ${line.charAt(0) + line.slice(1).toLowerCase()}`;
      }
      return line;
    })
    .join("\n\n");
  return markdownToDocument(md);
}

/**
 * Turns an extracted resume into a resume document. A Word file read word
 * for word keeps its own design on export (`keepsDesign`). Otherwise, with a
 * Gemini key, the AI rebuilds clean structure from the text; without one,
 * the rule-based PDF parse is used, or the text is split by line.
 */
export async function importResume(
  userId: string,
  resume: ExtractedResume,
  apiKey: string | null,
): Promise<{ title: string; content: DocumentContent; usedAi: boolean; keepsDesign: boolean }> {
  if (resume.source === "word") {
    return { title: resume.title || "Master resume", content: resume.content, usedAi: false, keepsDesign: true };
  }

  const { text, parsed } = resume;
  if (text.replace(/\s+/g, "").length < 30) {
    throw new ImportError(
      "We found almost no text in that resume. If it's a scanned image, paste the text instead.",
    );
  }

  if (apiKey) {
    try {
      const ai = await parseResume(geminiModel(apiKey, userId), text);
      const content = markdownToDocument(ai.markdown);
      if (content.content.length >= 3) return { title: ai.title.trim() || "Master resume", content, usedAi: true, keepsDesign: false };
    } catch {
      // Fall through to the non-AI path; the user can still review and fix it.
    }
  }

  if (parsed) return { title: "Master resume", content: parsed, usedAi: false, keepsDesign: false };
  return { title: "Master resume", content: plainTextToDocument(text), usedAi: false, keepsDesign: false };
}
