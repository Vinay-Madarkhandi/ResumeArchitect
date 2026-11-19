import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { resumeContentToDoc } from "@/lib/documentConversion";
import { docxToDocument } from "@/lib/docx/inPlace";
import { parseResumeFile } from "@/lib/resume-parser";
import { toUnits } from "@/lib/resume/units";
import type { DocumentContent } from "@/lib/schemas/document";

/**
 * What an uploaded resume file holds, read without AI. Runs inside the
 * budgeted file worker (lib/report/inspectWorker.ts), only on bytes the
 * inspection already bounded.
 */
export type ExtractedResume =
  /** A Word file read paragraph by paragraph, word for word, so its own design can be kept on export. */
  | { source: "word"; title: string; content: DocumentContent }
  /** Plain text, with the rule-based PDF parse when there is one. */
  | { source: "text"; text: string; parsed: DocumentContent | null };

export async function extractDocx(file: Uint8Array): Promise<ExtractedResume> {
  const content = await docxToDocument(file).catch(() => null);
  const units = content ? toUnits(content) : [];
  if (content && units.length >= 3) {
    return { source: "word", title: units[0].kind === "heading" ? units[0].text : "", content };
  }
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(file.buffer, file.byteOffset, file.byteLength) });
  return { source: "text", text: value, parsed: null };
}

export async function extractPdf(file: Uint8Array): Promise<ExtractedResume> {
  const proxyBytes = new Uint8Array(Buffer.from(file.buffer, file.byteOffset, file.byteLength));
  const parseBytes = new Uint8Array(Buffer.from(file.buffer, file.byteOffset, file.byteLength));
  const { text } = await extractText(await getDocumentProxy(proxyBytes), { mergePages: true });
  const parsed = await parseResumeFile(parseBytes.buffer).then(({ content }) => resumeContentToDoc(content), () => null);
  return { source: "text", text, parsed };
}
