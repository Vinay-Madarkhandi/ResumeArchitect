"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DocumentContentSchema } from "@/lib/schemas/document";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Promotes a reviewed draft to the user's master resume, archiving the
 * previous master (a new row, so earlier applications keep their source
 * link), and marks onboarding complete.
 */
export async function finalizeMasterResume(resumeId: string, content: unknown, title: string): Promise<ActionResult> {
  const doc = DocumentContentSchema.safeParse(content);
  if (!doc.success) return { ok: false, error: "That resume couldn't be read. Reload and try again." };

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, kind")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .single();
  if (!resume || resume.kind !== "master") return { ok: false, error: "That resume could not be found." };

  const { data: previous } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "master")
    .eq("is_default", true)
    .neq("id", resumeId)
    .maybeSingle();
  if (previous) {
    await supabase.from("resumes").update({ is_default: false, status: "archived" }).eq("id", previous.id);
  }

  const { error } = await supabase
    .from("resumes")
    .update({ content: doc.data, is_default: true, title: title.trim().slice(0, 160) || "Master resume" })
    .eq("id", resumeId);
  if (error) return { ok: false, error: "Couldn't save your resume. Try again." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ default_resume_id: resumeId, onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: "Saved, but couldn't finish setup. Try again." };

  return { ok: true };
}
