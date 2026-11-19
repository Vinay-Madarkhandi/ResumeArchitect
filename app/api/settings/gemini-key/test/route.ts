import { limitAi } from "@/lib/server/rateLimit";
import { updateKey } from "@/lib/data/profiles";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";
import { testGeminiApiKey } from "@/lib/gemini/testConnection";
import { loadGeminiKey } from "@/lib/server/geminiKey";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const key = await loadGeminiKey(user.id);
  if (!key.ok) return NextResponse.json({ valid: false, message: key.message }, { status: 400 });

  const limited = await limitAi(user.id, "key-test");
  if (limited) return limited;

  const result = await testGeminiApiKey(key.apiKey, user.id);
  const now = new Date().toISOString();
  // Only a definite answer from Google changes the stored status.
  if (result.valid || result.rejected) {
    await updateKey(user.id, { gemini_key_status: result.valid ? "valid" : "invalid", gemini_key_validated_at: now }, key.ciphertext);
  }

  return NextResponse.json({ valid: result.valid, message: result.message, validatedAt: now });
}
