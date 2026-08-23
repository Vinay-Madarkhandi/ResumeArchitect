import { z } from "zod";

/** Response shape for a single selection-scoped AI edit (select text in the
 * document canvas, tell it what to change, preview before applying — see
 * components/editor/AskAiBubbleMenu.tsx). Deliberately separate from
 * TailoringResultSchema: this is a tiny, tightly-scoped edit to one snippet
 * of text, not a whole-document rewrite. */
export const SelectionEditResultSchema = z.object({
  replacementText: z.string(),
  flagged: z.boolean().default(false),
  flagReason: z.string().nullable().default(null),
});
export type SelectionEditResult = z.infer<typeof SelectionEditResultSchema>;

export const MAX_SELECTION_LENGTH = 2000;
