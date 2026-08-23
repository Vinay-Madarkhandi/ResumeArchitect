import { Type, type Schema } from "@google/genai";

/**
 * Hand-authored mirror of TailoringResultSchema (lib/schemas/tailoring.ts) in
 * Gemini's own schema dialect — not JSON Schema, so there's no reliable
 * auto-converter from the Zod schema. Keep this in sync by hand whenever the
 * Zod schema changes; the route handler always re-validates Gemini's actual
 * response through TailoringResultSchema.safeParse() regardless, so drift
 * here fails safe (a schema-validation error) rather than silently.
 *
 * Deliberately just one string field plus a flat change list — asking
 * Gemini to emit a valid recursive document-node tree via responseSchema
 * is unreliable; a single Markdown string is the same reliable
 * structured-output shape the rest of this app already uses elsewhere.
 */

const changeExplanationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    kind: {
      type: Type.STRING,
      enum: ["change", "flagged"],
      description: "\"change\" for a normal tailoring edit; \"flagged\" for a proper-noun-like phrase you used that isn't verbatim in the source.",
    },
    quote: {
      type: Type.STRING,
      nullable: true,
      description: "A short snippet (a few words) of the tailored text this note refers to, so the UI can locate it.",
    },
    whatChanged: { type: Type.STRING },
    why: { type: Type.STRING, description: "Tie this to a specific requirement in the job description — never a score." },
  },
  required: ["kind", "whatChanged", "why"],
};

export const tailoringResultGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    markdown: { type: Type.STRING, description: "The full tailored resume as Markdown." },
    changes: { type: Type.ARRAY, items: changeExplanationSchema },
  },
  required: ["markdown", "changes"],
};
