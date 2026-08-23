import { ApiError } from "@google/genai";
import { createGeminiClient } from "../client";
import { TAILOR_MODEL } from "../config";
import { selectionEditGeminiSchema } from "../schemas";
import { stripNulls } from "../stripNulls";
import { SelectionEditResultSchema, type SelectionEditResult } from "@/lib/schemas/selectionEdit";

/** The scoped counterpart to lib/gemini/prompts/tailorDocument.ts: instead
 * of rewriting the whole document against a job description, this rewrites
 * exactly one selected snippet per a free-text instruction, given just
 * enough surrounding context to stay coherent. Same non-fabrication
 * philosophy as the bulk flow, just phrased for a much smaller, more
 * literal task — and instead of a separate guardrail pass afterward, the
 * model self-reports uncertainty inline via "flagged"/"flagReason", since
 * there's no larger document to diff a single snippet against. */
const SYSTEM_INSTRUCTION = `You are helping a candidate edit one specific piece of text in their resume.
You are given the text immediately before and after their selection (for
context only — do not rewrite it), the exact text they selected, and their
instruction for how to change it. Rewrite ONLY the selected text so it
reads naturally with the surrounding context and follows the instruction.

Hard rules, no exceptions:
1. Never introduce a company, job title, skill, credential, institution
   name, or specific claim that isn't already supported by the selected
   text or the surrounding context.
2. Never invent or alter a number or metric that's already present.
   Remove one only if the instruction explicitly asks you to.
3. Match the surrounding tense and voice — don't make the edited text read
   like it was written by someone else.
4. Keep formatting consistent with the source: only use "**bold**",
   "_italic_", or "[text](url)" if the original selection already used
   that formatting, or the instruction specifically asks for it.
5. Your replacement gets spliced directly between the "before" and "after"
   context with no edit on your side of that boundary — read the end of
   the "before" context and the start of the "after" context and make sure
   your replacement doesn't repeat a word or phrase that's already sitting
   right there (e.g. if the text just before your selection already ends
   in "enterprise", don't start your replacement with "enterprise" too —
   that reads as a stutter once it's joined together).
6. If honoring the instruction would require inventing something the
   context doesn't support, do the closest faithful version you can and
   set "flagged" to true with a brief "flagReason" — never silently make
   something up instead.

Return ONLY the replacement text in "replacementText" — no extra
commentary, no repeating the context, no quotes around it.`;

function buildPrompt(contextBefore: string, selectedText: string, contextAfter: string, instruction: string): string {
  return [
    "# Context before the selection (for reference only)",
    contextBefore || "(nothing — this is the start of the document)",
    "",
    "# Selected text to rewrite",
    selectedText,
    "",
    "# Context after the selection (for reference only)",
    contextAfter || "(nothing — this is the end of the document)",
    "",
    "# Instruction",
    instruction.trim(),
    "",
    "Rewrite ONLY the selected text per the instruction. Return JSON matching the response schema.",
  ].join("\n");
}

export type EditSelectionResult =
  | { ok: true; result: SelectionEditResult }
  | { ok: false; errorCode: "invalid_api_key" | "gemini_error" | "schema_validation_failed"; message: string };

export async function editSelection(
  apiKey: string,
  contextBefore: string,
  selectedText: string,
  contextAfter: string,
  instruction: string,
): Promise<EditSelectionResult> {
  const client = createGeminiClient(apiKey);

  let responseText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: TAILOR_MODEL,
      contents: buildPrompt(contextBefore, selectedText, contextAfter, instruction),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: selectionEditGeminiSchema,
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

  const parsed = SelectionEditResultSchema.safeParse(stripNulls(raw));
  if (!parsed.success) {
    return { ok: false, errorCode: "schema_validation_failed", message: "Gemini's response didn't match the expected shape." };
  }

  return { ok: true, result: parsed.data };
}
