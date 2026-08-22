import { GoogleGenAI } from "@google/genai";

/** Always constructed from a freshly-decrypted plaintext key, scoped to the
 * single server-side call that needs it — never cached, never logged. */
export function createGeminiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}
