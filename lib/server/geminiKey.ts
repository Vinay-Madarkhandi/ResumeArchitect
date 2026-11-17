import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { decryptApiKey } from "@/lib/crypto/keyCipher";
import { pgByteaToBuffer } from "@/lib/crypto/bytea";

export type KeyResult =
  | { ok: true; apiKey: string }
  | { ok: false; code: "missing_api_key" | "invalid_api_key"; message: string };

/**
 * Loads and decrypts the signed-in user's Gemini key. A key marked invalid
 * is still returned: Google may have rejected it transiently, and the call
 * that follows reports a real rejection with a precise message.
 */
export async function loadGeminiKey(supabase: SupabaseClient<Database>, userId: string): Promise<KeyResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_key_ciphertext, gemini_key_status")
    .eq("id", userId)
    .single();

  if (!profile?.gemini_key_ciphertext || profile.gemini_key_status === "not_configured") {
    return { ok: false, code: "missing_api_key", message: "Connect your Gemini API key in Settings first." };
  }
  try {
    return { ok: true, apiKey: decryptApiKey(pgByteaToBuffer(profile.gemini_key_ciphertext)) };
  } catch {
    return { ok: false, code: "invalid_api_key", message: "Your saved key couldn't be read. Enter it again in Settings." };
  }
}
