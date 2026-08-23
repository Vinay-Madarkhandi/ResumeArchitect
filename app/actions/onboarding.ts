"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ResumeContentSchema } from "@/lib/schemas/resume";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Confirms the reviewed content, promotes this resume to the user's master,
 * and archives whichever resume was previously the default master (see
 * "replacing the master resume" in the plan — a new row, not an in-place
 * edit, so prior tailored resumes' source links stay valid). */
export async function finalizeMasterResume(resumeId: string, content: unknown): Promise<ActionResult> {
  const parsedContent = ResumeContentSchema.safeParse(content);
  if (!parsedContent.success) {
    return { ok: false, error: "Resume content didn't match the expected shape." };
  }

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: resume, error: fetchError } = await supabase
    .from("resumes")
    .select("id, kind, user_id")
    .eq("id", resumeId)
    .single();

  if (fetchError || !resume || resume.user_id !== user.id || resume.kind !== "master") {
    return { ok: false, error: "That resume could not be found." };
  }

  const { data: previousDefault } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "master")
    .eq("is_default", true)
    .neq("id", resumeId)
    .maybeSingle();

  if (previousDefault) {
    await supabase
      .from("resumes")
      .update({ is_default: false, status: "archived" })
      .eq("id", previousDefault.id);
  }

  const { error: updateError } = await supabase
    .from("resumes")
    .update({ content: parsedContent.data, is_default: true })
    .eq("id", resumeId);
  if (updateError) return { ok: false, error: updateError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ default_resume_id: resumeId })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: profileError.message };

  return { ok: true };
}

export async function completeOnboarding(): Promise<ActionResult> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  redirect("/library");
}
