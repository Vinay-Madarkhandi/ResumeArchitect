import { limitAi } from "@/lib/server/rateLimit";
import { checkOrigin } from "@/lib/auth/guards";
import { NextResponse } from "next/server";
import { requireOwnedResume } from "@/lib/server/ownedResume";
import { AiError, geminiModel } from "@/lib/gemini/model";
import { editSelection } from "@/lib/gemini/prompts/editSelection";
import { loadGeminiKey } from "@/lib/server/geminiKey";
import { MAX_SELECTION_LENGTH } from "@/lib/schemas/selectionEdit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Scoped "select text, ask AI to rewrite just this" — available on any
 * resume being edited (master or tailored), not just tailored ones. The
 * :id param scopes the request to a resume the caller actually owns; the
 * selection/context/instruction come from the client's live editor state
 * directly rather than being re-fetched here. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  const owned = await requireOwnedResume(id);
  if (!owned.ok) return owned.response;
  const { user } = owned;

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

  const limited = await limitAi(user.id, "ai-edit");
  if (limited) return limited;

  const key = await loadGeminiKey(user.id);
  if (!key.ok) return NextResponse.json({ error: key.message }, { status: 400 });

  try {
    const result = await editSelection(geminiModel(key.apiKey), { contextBefore, selectedText, contextAfter, instruction });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof AiError ? error.message : "Something went wrong. Try again.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
