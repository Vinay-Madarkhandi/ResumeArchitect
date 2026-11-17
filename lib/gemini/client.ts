import { GoogleGenAI } from "@google/genai";

/**
 * Always constructed from a freshly decrypted key, scoped to the single
 * server-side call that needs it: never cached, never logged.
 * GEMINI_API_BASE_URL points the SDK at a different endpoint (a proxy, or the
 * local fake used by end-to-end tests); production leaves it unset.
 */
export function createGeminiClient(apiKey: string) {
  const baseUrl = process.env.GEMINI_API_BASE_URL;
  return new GoogleGenAI({ apiKey, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) });
}
