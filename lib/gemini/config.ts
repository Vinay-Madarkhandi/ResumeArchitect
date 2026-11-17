/**
 * The Gemini model every AI step uses. Override with GEMINI_MODEL when Google
 * ships or retires a model; the key test checks the same model, so a bad
 * name shows up as a clear error when the user connects their key.
 */
export const TAILOR_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
export const TEST_CONNECTION_MODEL = TAILOR_MODEL;
