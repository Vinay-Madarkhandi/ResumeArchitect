import { limitAi } from "@/lib/server/rateLimit";
import { updateKey } from "@/lib/data/profiles";
import { logger } from "@/lib/logger";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";
import { testGeminiApiKey } from "@/lib/gemini/testConnection";
import { encryptApiKey, lastFour } from "@/lib/crypto/keyCipher";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) return NextResponse.json({ error: "Enter an API key." }, { status: 400 });

  const limited = await limitAi(user.id, "key-test");
  if (limited) return limited;

  const result = await testGeminiApiKey(apiKey);
  if (!result.valid) {
    // A rejected replacement key is simply not saved: the key already on
    // file (if any) keeps working, so its status is left alone.
    return NextResponse.json({ error: result.message }, { status: result.rejected ? 422 : 503 });
  }

  // The key validated against Gemini above; everything past this point is
  // our own encryption/storage, which can throw (e.g. a misconfigured
  // KEY_ENCRYPTION_SECRET on the deployment). Without this guard an
  // unhandled throw here returns a non-JSON error page, which breaks the
  // client's res.json() call silently — the key would test as valid but
  // never actually get saved, with no visible error.
  try {
    const ciphertext = encryptApiKey(apiKey);
    const now = new Date().toISOString();
    const updated = await updateKey(user.id, {
        gemini_key_ciphertext: ciphertext,
        gemini_key_last4: lastFour(apiKey),
        gemini_key_status: "valid",
        gemini_key_updated_at: now,
        gemini_key_validated_at: now,
      });

    if (!updated) return NextResponse.json({ error: "Couldn't save your key. Please try again." }, { status: 500 });

    return NextResponse.json({ status: "valid", last4: lastFour(apiKey) });
  } catch {
    logger.error("Failed to encrypt or save Gemini key");
    return NextResponse.json(
      { error: "The key was valid, but we couldn't save it due to a server configuration issue. Please try again shortly." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const updated = await updateKey(user.id, {
      gemini_key_ciphertext: null,
      gemini_key_last4: null,
      gemini_key_status: "not_configured",
      gemini_key_updated_at: null,
      gemini_key_validated_at: null,
    });

  if (!updated) return NextResponse.json({ error: "Couldn't remove your key. Please try again." }, { status: 500 });
  return NextResponse.json({ status: "not_configured" });
}
