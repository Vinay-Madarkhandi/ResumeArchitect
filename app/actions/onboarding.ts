"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ResumeContentSchema } from "@/lib/schemas/resume";
import { resumeContentToDoc } from "@/lib/documentConversion";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Confirms the reviewed content, promotes this resume to the user's master,
 * and archives whichever resume was previously the default master (see
 * "replacing the master resume" in the plan — a new row, not an in-place
 * edit, so prior tailored resumes' source links stay valid).
 *
 * The onboarding review step still edits the parser's typed ResumeContent
 * output (ResumeContentEditor, unchanged) — it's reviewing structured
 * extraction results, a different job from ongoing document editing. This
 * is the one place that content gets converted into the freeform document
 * shape the editor (/resumes/[id]/edit) actually works with, so a freshly
 * onboarded user's master resume is already in the new shape from the
 * start, with no separate migration step. */
export async function finalizeMasterResume(resumeId: string, content: unknown): Promise<ActionResult> {
  const parsedContent = ResumeContentSchema.safeParse(content);
  if (!parsedContent.success) {
    return { ok: false, error: "Resume content didn't match the expected shape." };
  }
  const doc = resumeContentToDoc(parsedContent.data);

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
    .update({ content: doc, is_default: true })
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
  // Deliberately no redirect() here — the caller does a hard navigation once
  // it has confirmed this returned { ok: true }, rather than relying on
  // Next's action-redirect signal being intercepted correctly for an action
  // invoked from a bare onClick (not a <form action>). That guarantees the
  // browser's next request to /library is a genuinely fresh one that sees
  // this update, instead of depending on router-cache/soft-navigation
  // internals that reportedly weren't taking users there reliably.
  return { ok: true };
}
