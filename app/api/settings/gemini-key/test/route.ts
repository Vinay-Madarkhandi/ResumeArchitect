import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { testGeminiApiKey } from "@/lib/gemini/testConnection";
import { loadGeminiKey } from "@/lib/server/geminiKey";

export const runtime = "nodejs";

export async function POST() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const key = await loadGeminiKey(supabase, user.id);
  if (!key.ok) return NextResponse.json({ valid: false, message: key.message }, { status: 400 });

  const result = await testGeminiApiKey(key.apiKey);
  const now = new Date().toISOString();
  // Only a definite answer from Google changes the stored status.
  if (result.valid || result.rejected) {
    await supabase
      .from("profiles")
      .update({ gemini_key_status: result.valid ? "valid" : "invalid", gemini_key_validated_at: now })
      .eq("id", user.id);
  }

  return NextResponse.json({ valid: result.valid, message: result.message, validatedAt: now });
}
