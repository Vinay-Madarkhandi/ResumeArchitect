import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { SelectionEditResultSchema, type SelectionEditResult } from "@/lib/schemas/selectionEdit";

import { checkGrounding } from "@/lib/grounding";
import { VERIFY_CLAIM } from "@/lib/grounding/placeholder";

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

export async function editSelection(
  model: JsonModel,
  input: {
    contextBefore: string;
    selectedText: string;
    contextAfter: string;
    instruction: string;
    resumeMarkdown?: string;
  },
): Promise<SelectionEditResult> {
  const result = await generateStructured(model, {
    label: "editSelection",
    system: SYSTEM_INSTRUCTION,
    prompt: buildPrompt(input.contextBefore, input.selectedText, input.contextAfter, input.instruction),
    schema: SelectionEditResultSchema,
    temperature: 0.5,
  });
  const sources = [
    input.resumeMarkdown,
    input.contextBefore,
    input.selectedText,
    input.contextAfter,
  ].filter(Boolean) as string[];
  const { flags } = checkGrounding(sources.length ? sources : [input.selectedText], result.replacementText, { cites: result.cites });
  if (!flags.length && !result.flagged) return result;
  return {
    replacementText: VERIFY_CLAIM,
    cites: [],
    flagged: true,
    flagReason: flags[0]?.message ?? "Add the verified details directly to your resume.",
  };
}
