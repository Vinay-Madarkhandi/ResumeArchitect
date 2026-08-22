import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { testGeminiApiKey } from "@/lib/gemini/testConnection";
import { decryptApiKey } from "@/lib/crypto/keyCipher";
import { pgByteaToBuffer } from "@/lib/crypto/bytea";

export const runtime = "nodejs";

export async function POST() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_key_ciphertext")
    .eq("id", user.id)
    .single();

  if (!profile?.gemini_key_ciphertext) {
    return NextResponse.json({ valid: false, message: "No key is configured yet." }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(pgByteaToBuffer(profile.gemini_key_ciphertext));
  } catch {
    return NextResponse.json({ valid: false, message: "Your saved key couldn't be read. Please re-enter it." }, { status: 500 });
  }

  const result = await testGeminiApiKey(apiKey);
  const now = new Date().toISOString();
  await supabase
    .from("profiles")
    .update({ gemini_key_status: result.valid ? "valid" : "invalid", gemini_key_validated_at: now })
    .eq("id", user.id);

  return NextResponse.json({ valid: result.valid, message: result.message, validatedAt: now });
}
