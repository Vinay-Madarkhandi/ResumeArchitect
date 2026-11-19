"use server";

import { currentUser } from "@/lib/auth/current-user";
import { promoteMaster } from "@/lib/data/resumes";
import { DocumentContentSchema } from "@/lib/schemas/document";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function finalizeMasterResume(resumeId: string, content: unknown, title: string): Promise<ActionResult> {
  const doc = DocumentContentSchema.safeParse(content);
  if (!doc.success) return { ok: false, error: "That resume couldn't be read. Reload and try again." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  try {
    const saved = await promoteMaster(user.id, resumeId, doc.data, title.trim().slice(0, 160) || "Master resume");
    return saved ? { ok: true } : { ok: false, error: "That resume could not be found." };
  } catch {
    return { ok: false, error: "Couldn't save your resume. Try again." };
  }
}
