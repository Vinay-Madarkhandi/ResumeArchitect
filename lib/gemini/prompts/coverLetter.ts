import { z } from "zod";
import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";

const CoverLetterSchema = z.object({
  /** The letter as plain paragraphs separated by blank lines, greeting and sign-off included. */
  letter: z.string(),
});

export const COVER_LETTER_TONES = ["confident", "warm", "concise"] as const;
export type CoverLetterTone = (typeof COVER_LETTER_TONES)[number];

const SYSTEM = `You write cover letters for a candidate applying to one specific job.
You get their tailored resume (Markdown), the job's analysis, and the job post.

Hard rules:
1. Use only facts from the resume. Never invent employers, titles, numbers,
   projects, skills, or reasons for leaving. Never add a metric the resume
   doesn't state.
2. If the job asks for something the resume doesn't show, don't claim it.
3. No clichés ("I am writing to express my interest", "team player",
   "passionate", "synergy"). No flattery of the company you can't back up.

Shape: 3–4 short paragraphs, 220–320 words.
- Opening: the role, and the single strongest reason they fit, stated plainly.
- Middle: two concrete examples from the resume, each tied to a named
  requirement of the job.
- Close: what they'd do first or care about in the role, and a simple ask.
Greeting "Dear Hiring Manager," unless the post names a person or team.
Sign off with the candidate's name from the resume's first heading.
Plain text only: no Markdown, no bullet points.`;

export async function writeCoverLetter(
  model: JsonModel,
  input: { resumeMarkdown: string; job: JobAnalysis; jobText: string | null; tone: CoverLetterTone },
): Promise<string> {
  const prompt = [
    `# Tone\n${input.tone}`,
    `# Role\n${input.job.title}${input.job.company ? ` at ${input.job.company}` : ""}\n${input.job.summary}`,
    `# Requirements\n${input.job.requirements.map((r) => `- ${r.label} (${r.importance === "must" ? "must-have" : "nice-to-have"})`).join("\n")}`,
    input.jobText ? `# Job post\n${input.jobText.slice(0, 12_000)}` : "",
    `# Candidate's resume\n${input.resumeMarkdown}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const { letter } = await generateStructured(model, {
    label: "coverLetter",
    system: SYSTEM,
    prompt,
    schema: CoverLetterSchema,
    temperature: 0.7,
  });
  return letter.trim();
}
