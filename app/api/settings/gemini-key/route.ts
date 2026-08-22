import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { testGeminiApiKey } from "@/lib/gemini/testConnection";
import { encryptApiKey, lastFour } from "@/lib/crypto/keyCipher";
import { bufferToPgBytea } from "@/lib/crypto/bytea";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) return NextResponse.json({ error: "Enter an API key." }, { status: 400 });

  const result = await testGeminiApiKey(apiKey);
  if (!result.valid) {
    // Record the failed attempt so the UI can show "invalid" rather than
    // silently leaving a stale "valid" status from a previous key.
    await supabase
      .from("profiles")
      .update({ gemini_key_status: "invalid", gemini_key_validated_at: new Date().toISOString() })
      .eq("id", user.id);
    return NextResponse.json({ error: result.message }, { status: 422 });
  }

  const ciphertext = encryptApiKey(apiKey);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      gemini_key_ciphertext: bufferToPgBytea(ciphertext),
      gemini_key_last4: lastFour(apiKey),
      gemini_key_status: "valid",
      gemini_key_updated_at: now,
      gemini_key_validated_at: now,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Couldn't save your key. Please try again." }, { status: 500 });

  return NextResponse.json({ status: "valid", last4: lastFour(apiKey) });
}

export async function DELETE() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({
      gemini_key_ciphertext: null,
      gemini_key_last4: null,
      gemini_key_status: "not_configured",
      gemini_key_updated_at: null,
      gemini_key_validated_at: null,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Couldn't remove your key. Please try again." }, { status: 500 });
  return NextResponse.json({ status: "not_configured" });
}
