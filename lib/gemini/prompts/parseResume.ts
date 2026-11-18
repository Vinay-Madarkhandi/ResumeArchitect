import { z } from "zod";
import { generateStructured, type JsonModel } from "@/lib/gemini/model";

const ParsedResumeSchema = z.object({
  /** Short label for the library, e.g. "Ada Lovelace — Backend Engineer". */
  title: z.string(),
  markdown: z.string(),
});
export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

const SYSTEM = `You convert text extracted from a resume file into clean Markdown.
The extraction may have broken lines, merged columns, stray page numbers, or
odd spacing. Rebuild the resume faithfully.

Rules:
- Keep every fact, word for word where possible: names, employers, titles,
  dates, numbers, links. Never add, embellish, or summarize away content.
- Structure: "# Full Name" first, then a paragraph with contact details
  joined by " · " (email, phone, location, links), then "## " section headings
  (Summary, Experience, Education, Skills, Projects, Certifications, …).
- Under Experience, give each role a "### Title — Company" heading, then a
  paragraph with dates and location, then "-" bullets. Projects the same way
  with a "### Project name" heading.
- If an entry has a line listing its tech stack (e.g. "Java, Spring Boot,
  PostgreSQL"), keep it as its own "_italic_" paragraph right under the dates.
- Skills: one paragraph per group, each on its own line separated by a blank
  line, e.g. "**Languages:** Go, Python". Never merge groups into one paragraph.
- Keep the original wording and tense of every bullet.
- Inline formatting only: **bold**, _italic_, [text](url). No tables, images,
  code blocks, or HTML.
- Drop page numbers, headers/footers repeated on every page, and artifacts.`;

export async function parseResume(model: JsonModel, extractedText: string): Promise<ParsedResume> {
  return generateStructured(model, {
    label: "parseResume",
    system: SYSTEM,
    prompt: `# Extracted resume text\n\n${extractedText.slice(0, 30_000)}`,
    schema: ParsedResumeSchema,
    temperature: 0.1,
  });
}
