import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decryptApiKey } from "@/lib/crypto/keyCipher";
import { pgByteaToBuffer } from "@/lib/crypto/bytea";
import { editSelection } from "@/lib/gemini/prompts/editSelection";
import { MAX_SELECTION_LENGTH } from "@/lib/schemas/selectionEdit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Scoped "select text, ask AI to rewrite just this" — available on any
 * resume being edited (master or tailored), not just tailored ones. The
 * :id param scopes the request to a resume the caller actually owns; the
 * selection/context/instruction come from the client's live editor state
 * directly rather than being re-fetched here. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: resume } = await supabase.from("resumes").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const selectedText = typeof body?.selectedText === "string" ? body.selectedText : "";
  const contextBefore = typeof body?.contextBefore === "string" ? body.contextBefore : "";
  const contextAfter = typeof body?.contextAfter === "string" ? body.contextAfter : "";
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";

  if (!selectedText.trim()) {
    return NextResponse.json({ error: "Select some text first." }, { status: 400 });
  }
  if (selectedText.length > MAX_SELECTION_LENGTH) {
    return NextResponse.json({ error: "That selection is too long — try a smaller piece of text." }, { status: 400 });
  }
  if (!instruction) {
    return NextResponse.json({ error: "Tell it what to change." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_key_ciphertext, gemini_key_status")
    .eq("id", user.id)
    .single();

  if (!profile?.gemini_key_ciphertext || profile.gemini_key_status === "not_configured") {
    return NextResponse.json({ error: "Connect your Gemini API key in Settings first." }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(pgByteaToBuffer(profile.gemini_key_ciphertext));
  } catch {
    return NextResponse.json({ error: "Your saved key couldn't be read. Please re-enter it in Settings." }, { status: 400 });
  }

  const result = await editSelection(apiKey, contextBefore, selectedText, contextAfter, instruction);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 422 });
  }

  return NextResponse.json(result.result);
}
