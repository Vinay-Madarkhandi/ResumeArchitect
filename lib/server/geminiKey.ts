import { decryptApiKey } from "@/lib/crypto/keyCipher";
import { getKeyMaterial } from "@/lib/data/profiles";

export type KeyResult =
  | { ok: true; apiKey: string; ciphertext: Buffer }
  | { ok: false; code: "missing_api_key" | "invalid_api_key"; message: string };

export async function loadGeminiKey(userId: string): Promise<KeyResult> {
  const profile = await getKeyMaterial(userId);
  if (!profile?.gemini_key_ciphertext || profile.gemini_key_status === "not_configured") {
    return { ok: false, code: "missing_api_key", message: "Connect your Gemini API key in Settings first." };
  }
  try {
    return { ok: true, apiKey: decryptApiKey(profile.gemini_key_ciphertext), ciphertext: profile.gemini_key_ciphertext };
  } catch {
    return { ok: false, code: "invalid_api_key", message: "Your saved key couldn't be read. Enter it again in Settings." };
  }
}
