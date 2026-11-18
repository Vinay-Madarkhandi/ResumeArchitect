import { ApiError } from "@google/genai";
import { recordAiCall } from "@/lib/data/ai-calls";
import { createGeminiClient } from "./client";
import { TEST_CONNECTION_MODEL } from "./config";

export interface TestConnectionResult {
  valid: boolean;
  /** True only when Google refused the key itself, not on network or quota trouble. */
  rejected: boolean;
  message: string;
}

/** Cheapest real call that authenticates the key: lists 1 model, which
 * consumes no generation/output-token quota. Used both when a key is first
 * saved and from the Settings "Test connection" action. */
export async function testGeminiApiKey(apiKey: string, userId: string): Promise<TestConnectionResult> {
  if (!apiKey.trim()) {
    return { valid: false, rejected: true, message: "Enter an API key." };
  }

  const started = performance.now();
  let errorCode: string | null = null;
  try {
    const client = createGeminiClient(apiKey);
    // A metadata fetch, not a generation call — costs no output-token quota,
    // and confirms this key can actually reach the model tailoring uses.
    await client.models.get({ model: TEST_CONNECTION_MODEL });
    return { valid: true, rejected: false, message: "Connected." };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401 || error.status === 403)) {
      errorCode = "invalid_api_key";
      return { valid: false, rejected: true, message: "Google rejected that key. Copy it again from AI Studio and retry." };
    }
    errorCode = error instanceof ApiError && error.status === 429 ? "rate_limited" : "gemini_error";
    return { valid: false, rejected: false, message: "Couldn't reach Gemini to check the key. Try again in a moment." };
  } finally {
    await recordAiCall(userId, {
      kind: "key-test", model: TEST_CONNECTION_MODEL, ok: errorCode === null, error_code: errorCode,
      latency_ms: Math.round(performance.now() - started),
    });
  }
}
