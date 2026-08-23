import { ApiError } from "@google/genai";
import { createGeminiClient } from "../client";
import { TAILOR_MODEL } from "../config";
import { tailoringResultGeminiSchema } from "../schemas";
import { stripNulls } from "../stripNulls";
import { TailoringResultSchema, type TailoringResult } from "@/lib/schemas/tailoring";

/**
 * The hard non-fabrication rules are unchanged in substance from the old
 * typed-JSON prompt — they're just written for prose/Markdown instead of
 * object fields now that tailoring operates on the freeform document. The
 * resume-writing craft section is new: it's what makes a tailored resume
 * actually read well, not just pass the non-fabrication rules.
 */
const SYSTEM_INSTRUCTION = `You are an expert resume editor helping a candidate tailor their resume for
a specific job. You are given their existing resume as Markdown and the
text of a job description they are applying to. Produce a tailored version
of that SAME resume — same person, same real experience — restructured and
reworded to be as relevant and compelling as possible for this specific
job, written the way a skilled human resume writer would, not just
technically rearranged.

Hard rules, no exceptions:
1. Only reorder, reword, re-emphasize, condense, or expand on content that
   is already present in the source Markdown. Never introduce a company,
   job title, skill, project, certification, credential, institution, or
   piece of experience that is not present in the source.
2. Never invent or alter a number or metric. If a bullet has no metric in
   the source, do not add one — strengthen it with sharper language
   instead of fabricated data.
3. You may adopt terminology from the job description ONLY if the
   underlying claim is already true of the candidate's real experience
   (e.g. rewording "JavaScript" to "JS" is fine; claiming Kubernetes
   experience the candidate never mentioned is not, even if the job
   description asks for it).
4. If the job description implies a requirement the resume doesn't
   support, simply do not address it — never fabricate to fit.
5. You MAY reorder entries within a section (e.g. move a more relevant
   project above a less relevant one) to put the most relevant items
   first — that's a normal, encouraged part of tailoring. Keep the same
   section headings as the source; don't invent new ones.
6. Output valid Markdown using exactly this vocabulary: "#"/"##"/"###"
   headings, plain paragraphs, "-" bullet list items, "1." numbered list
   items, and "**bold**" / "_italic_" / "[text](url)" inline formatting.
   Nothing else — no tables, code blocks, blockquotes, or images.

Resume-writing craft — this is what makes the result actually good, not
just compliant:
- Lead bullets with strong, specific action verbs (Built, Led, Designed,
  Reduced, Automated) — not weak openers like "Responsible for" or
  "Worked on".
- Be concise. A sharp 15-word bullet beats a padded 30-word one that says
  the same thing. Cut filler and redundant phrasing.
- Keep every existing metric exactly as given — never round, estimate, or
  drop a real number, and never add one that wasn't there.
- When the job description emphasizes something the candidate genuinely
  has, surface the bullets that demonstrate it earlier and phrase them so
  the connection is obvious — don't make the reader infer it.
- Avoid generic filler that could describe anyone ("dynamic team player",
  "results-oriented professional"). Every line should reflect something
  specific and true about this candidate.

For every section you materially changed, add one "changes" entry with
kind "change": a short "quote" (a few words of the tailored text, so the
UI can locate it), "whatChanged" describing the edit, and "why" tied to a
specific aspect of the job description. Never include a score, percentage,
or confidence rating anywhere — plain language only. Trivial rewording
doesn't need its own entry; only note changes worth a human reviewing. If
nothing meaningful can be improved for a section, leave it unchanged and
don't invent an entry for it.

Additionally — a safety net on top of rule 1, not a substitute for it: if
you use any proper-noun-like phrase (a name, place, or organization) in
the tailored text that is not verbatim present anywhere in the source
Markdown, add a "changes" entry with kind "flagged" quoting that phrase,
explaining in "why" what it is and where it came from.`;

function buildPrompt(sourceMarkdown: string, jobDescriptionText: string): string {
  return [
    "# Candidate's existing resume (Markdown)",
    sourceMarkdown,
    "",
    "# Job description",
    jobDescriptionText.trim(),
    "",
    "Produce the tailored resume as Markdown and the change list as JSON matching the response schema.",
  ].join("\n");
}

export type TailorDocumentResult =
  | { ok: true; result: TailoringResult }
  | { ok: false; errorCode: "invalid_api_key" | "gemini_error" | "schema_validation_failed"; message: string };

export async function tailorDocument(
  apiKey: string,
  sourceMarkdown: string,
  jobDescriptionText: string,
): Promise<TailorDocumentResult> {
  const client = createGeminiClient(apiKey);

  let responseText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: TAILOR_MODEL,
      contents: buildPrompt(sourceMarkdown, jobDescriptionText),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: tailoringResultGeminiSchema,
      },
    });
    responseText = response.text;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401 || error.status === 403)) {
      return { ok: false, errorCode: "invalid_api_key", message: "Your Gemini key was rejected. Please check it in Settings." };
    }
    return { ok: false, errorCode: "gemini_error", message: "Something went wrong talking to Gemini. Please try again." };
  }

  if (!responseText) {
    return { ok: false, errorCode: "gemini_error", message: "Gemini returned an empty response. Please try again." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(responseText);
  } catch {
    return { ok: false, errorCode: "schema_validation_failed", message: "Gemini's response wasn't valid JSON." };
  }

  const parsed = TailoringResultSchema.safeParse(stripNulls(raw));
  if (!parsed.success) {
    return { ok: false, errorCode: "schema_validation_failed", message: "Gemini's response didn't match the expected shape." };
  }

  return { ok: true, result: parsed.data };
}
