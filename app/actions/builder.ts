"use server";

import { currentUser } from "@/lib/auth/current-user";
import { AssistInput, suggestBuilderField } from "@/lib/builder/assist";
import { DraftSchema, draftProblems, draftTitle, draftToDocument } from "@/lib/builder/draft";
import { rateLimit } from "@/lib/cache/rateLimit";
import { createBuiltMaster } from "@/lib/data/resumes";
import { AiError, geminiModel } from "@/lib/gemini/model";
import { loadGeminiKey } from "@/lib/server/geminiKey";

export async function saveBuilderResume(input: unknown) {
  const user = await currentUser();
  if (!user) return { error: "Sign in to save your resume." };
  const parsed = DraftSchema.safeParse(input);
  if (!parsed.success) return { error: "Some fields are too long. Shorten them and try again." };
  const draft = parsed.data;
  const [error] = draftProblems(draft);
  if (error) return { error };

  try {
    const id = await createBuiltMaster(user.id, {
      title: draftTitle(draft),
      content: draftToDocument(draft),
      template: draft.template,
    });
    return id ? { id } : { error: "Your profile could not be found." };
  } catch {
    return { error: "Couldn't save your resume. Try again." };
  }
}

export async function assistBuilderField(input: unknown) {
  const user = await currentUser();
  if (!user) return { error: "Sign in to use Gemini." };
  const parsed = AssistInput.safeParse(input);
  if (!parsed.success) return { error: "Add a short description first." };

  try {
    const key = await loadGeminiKey(user.id);
    if (!key.ok) return { error: key.message };
    if (await rateLimit("ai-builder", user.id, 30, 3_600_000)) {
      return { error: "You've reached the hourly limit. Try again later." };
    }
    return { lines: await suggestBuilderField(geminiModel(key.apiKey, user.id), parsed.data) };
  } catch (error) {
    return { error: error instanceof AiError ? error.message : "Couldn't get a suggestion. Try again." };
  }
}
