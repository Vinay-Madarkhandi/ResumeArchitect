import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { geminiModel } from "@/lib/gemini/model";
import { parseResume } from "@/lib/gemini/prompts/parseResume";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { resumeContentToDoc } from "@/lib/documentConversion";
import { parseResumeFile } from "@/lib/resume-parser";
import type { DocumentContent } from "@/lib/schemas/document";

export class ImportError extends Error {}

export type SourceKind = "pdf" | "docx" | "text";

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

export async function extractPlainText(kind: SourceKind, buffer: ArrayBuffer): Promise<string> {
  try {
    if (kind === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buffer.slice(0)));
      const { text } = await extractText(pdf, { mergePages: true });
      return text;
    }
    if (kind === "docx") {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      return value;
    }
    return new TextDecoder().decode(buffer);
  } catch {
    throw new ImportError(
      kind === "pdf"
        ? "This PDF couldn't be read. It may be password-protected or damaged."
        : "This file couldn't be read. Try exporting it again, or paste the text instead.",
    );
  }
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
 * Turns an uploaded file (or pasted text) into a resume document. With a
 * Gemini key, the AI rebuilds clean structure from the extracted text; without
 * one, PDFs go through the rule-based parser and other text is split by line.
 */
export async function importResume(
  input: { kind: SourceKind; buffer: ArrayBuffer } | { kind: "text"; text: string },
  apiKey: string | null,
): Promise<{ title: string; content: DocumentContent; usedAi: boolean }> {
  const text = "text" in input ? input.text : await extractPlainText(input.kind, input.buffer);
  if (text.replace(/\s+/g, "").length < 80) {
    throw new ImportError(
      "We found almost no text in that resume. If it's a scanned image, paste the text instead.",
    );
  }

  if (apiKey) {
    try {
      const parsed = await parseResume(geminiModel(apiKey), text);
      const content = markdownToDocument(parsed.markdown);
      if (content.content.length >= 3) return { title: parsed.title.trim() || "Master resume", content, usedAi: true };
    } catch {
      // Fall through to the non-AI path; the user can still review and fix it.
    }
  }

  if ("buffer" in input && input.kind === "pdf") {
    try {
      const { content } = await parseResumeFile(input.buffer.slice(0));
      return { title: "Master resume", content: resumeContentToDoc(content), usedAi: false };
    } catch {
      // Use the line-based fallback below.
    }
  }
  return { title: "Master resume", content: plainTextToDocument(text), usedAi: false };
}
