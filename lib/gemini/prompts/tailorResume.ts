import { ApiError } from "@google/genai";
import { createGeminiClient } from "../client";
import { TAILOR_MODEL } from "../config";
import { tailoringResultGeminiSchema } from "../schemas";
import { stripNulls } from "../stripNulls";
import { TailoringResultSchema, type TailoringResult } from "@/lib/schemas/tailoring";
import type { ResumeContent } from "@/lib/schemas/resume";

const SYSTEM_INSTRUCTION = `You are a careful resume editor. You are given a candidate's existing resume as
structured JSON and the text of a job description they are applying to. Your
job is to produce a tailored version of that SAME resume — one that presents
the candidate's real, existing experience in the way most relevant to this
specific job.

Hard rules, no exceptions:
1. Only reorder, reword, re-emphasize, condense, or expand on content that is
   already present in the source resume JSON.
2. Never introduce a company, job title, skill, project, certification,
   credential, or piece of experience that is not present in the source.
3. Never invent or alter a number or metric. If a bullet has no metric in the
   source, do not add one.
4. You may adopt terminology from the job description in a bullet ONLY if the
   underlying claim is already true of the candidate's real experience (e.g.
   rewording "JavaScript" to "JS" is fine; claiming Kubernetes experience the
   candidate never mentioned is not, even if the job description asks for it).
5. If the job description implies a requirement the resume doesn't support,
   simply do not address it — never fabricate to fit.
6. Preserve every entry's "id" field exactly as given in the source for any
   entry, bullet, project, education entry, skill group, or certification
   that already existed. Only omit "id" for something genuinely new (e.g. a
   brand-new bullet you added by splitting an existing one) — omitting an id
   for a new item is fine; changing an id that already existed is not.
7. You MAY reorder the experience/projects/skills arrays to put the most
   relevant items first — that is a normal, encouraged part of tailoring.
8. For every section you materially changed, add one entry to "changes"
   describing what changed and WHY, tied to a specific aspect of the job
   description. Never include a score, percentage, or confidence rating
   anywhere in your response — describe the reasoning in plain language
   instead. Trivial rewording does not need its own change entry; only
   describe changes a human would actually care about reviewing.
9. If nothing meaningful can be improved for a given section, leave it
   unchanged and do not invent a change entry for it.`;

function buildPrompt(resume: ResumeContent, jobDescriptionText: string): string {
  return [
    "# Candidate's existing resume (JSON)",
    "```json",
    JSON.stringify(resume, null, 2),
    "```",
    "",
    "# Job description",
    jobDescriptionText.trim(),
    "",
    "Produce the tailored resume and change list as JSON matching the response schema.",
  ].join("\n");
}

export type TailorResumeResult =
  | { ok: true; result: TailoringResult }
  | { ok: false; errorCode: "invalid_api_key" | "gemini_error" | "schema_validation_failed"; message: string };

export async function tailorResume(
  apiKey: string,
  resume: ResumeContent,
  jobDescriptionText: string,
): Promise<TailorResumeResult> {
  const client = createGeminiClient(apiKey);

  let responseText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: TAILOR_MODEL,
      contents: buildPrompt(resume, jobDescriptionText),
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
    return { ok: false, errorCode: "schema_validation_failed", message: "Gemini's response didn't match the expected resume shape." };
  }

  return { ok: true, result: parsed.data };
}
