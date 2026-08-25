import { ApiError } from "@google/genai";
import { createGeminiClient } from "../client";
import { TAILOR_MODEL } from "../config";
import { matchAnalysisGeminiSchema } from "../schemas";
import { stripNulls } from "../stripNulls";
import { MatchAnalysisResultSchema, type MatchAnalysisResult } from "@/lib/schemas/matchAnalysis";

/**
 * Job-match analysis — a read-only assessment, not a rewrite. Extracts what
 * the job description actually asks for, then checks the resume for real
 * evidence of each item (the underlying capability, not just the literal
 * keyword — "Node.js" counts as evidence for "JavaScript backend
 * development"). See lib/schemas/matchAnalysis.ts for why this returns a
 * requirements list rather than a score.
 */
const SYSTEM_INSTRUCTION = `You are analyzing how well a candidate's resume matches a job description's
requirements. This is an analysis task, not a rewrite — you are not editing
the resume.

Given the job description and the candidate's resume (as Markdown):

1. Extract the concrete skills, technologies, qualifications, and
   requirements the job description actually asks for — explicit ones
   (named tools, technologies, certifications, years of experience) and
   clearly implied ones (e.g. "build scalable APIs" implies backend/API
   development experience). List each as a short phrase (2-5 words), most
   important first, capped at roughly the 15 most significant ones. Don't
   pad the list with trivial or vague items just to have more entries.

2. For each item in that list, decide whether the resume provides real
   evidence of it — the underlying capability, not just a literal keyword
   match. List the ones the resume does NOT provide evidence for as
   "missingSkills", reusing the exact same phrase as it appears in
   "requiredSkills" for each one (so they can be matched up automatically).
   Be fair and specific: don't mark something missing if the resume clearly
   demonstrates it under different wording, and don't invent a requirement
   the job description doesn't actually support.

3. Write one factual, plain-language sentence in "summary" — no score, no
   percentage, no "great fit" filler. State the strongest area of overlap
   and the most significant gap, if there is one.`;

function buildPrompt(resumeMarkdown: string, jobDescriptionText: string): string {
  return [
    "# Candidate's resume (Markdown)",
    resumeMarkdown,
    "",
    "# Job description",
    jobDescriptionText.trim(),
    "",
    "Analyze the match per the instructions and return JSON matching the response schema.",
  ].join("\n");
}

export type AnalyzeMatchResult =
  | { ok: true; result: MatchAnalysisResult }
  | { ok: false; errorCode: "invalid_api_key" | "gemini_error" | "schema_validation_failed"; message: string };

export async function analyzeMatch(
  apiKey: string,
  resumeMarkdown: string,
  jobDescriptionText: string,
): Promise<AnalyzeMatchResult> {
  const client = createGeminiClient(apiKey);

  let responseText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: TAILOR_MODEL,
      contents: buildPrompt(resumeMarkdown, jobDescriptionText),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: matchAnalysisGeminiSchema,
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

  const parsed = MatchAnalysisResultSchema.safeParse(stripNulls(raw));
  if (!parsed.success) {
    return { ok: false, errorCode: "schema_validation_failed", message: "Gemini's response didn't match the expected shape." };
  }

  return { ok: true, result: parsed.data };
}
