import { ApiError } from "@google/genai";
import { createGeminiClient } from "./client";
import { TEST_CONNECTION_MODEL } from "./config";

export interface TestConnectionResult {
  valid: boolean;
  message: string;
}

/** Cheapest real call that authenticates the key: lists 1 model, which
 * consumes no generation/output-token quota. Used both when a key is first
 * saved and from the Settings "Test connection" action. */
export async function testGeminiApiKey(apiKey: string): Promise<TestConnectionResult> {
  if (!apiKey.trim()) {
    return { valid: false, message: "Enter an API key." };
  }

  try {
    const client = createGeminiClient(apiKey);
    // A metadata fetch, not a generation call — costs no output-token quota,
    // and confirms this key can actually reach the model tailoring uses.
    await client.models.get({ model: TEST_CONNECTION_MODEL });
    return { valid: true, message: "Connected." };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401 || error.status === 403)) {
      return { valid: false, message: "That key was rejected by Google. Double-check it and try again." };
    }
    return { valid: false, message: "Couldn't reach Gemini right now. Please try again in a moment." };
  }
}
