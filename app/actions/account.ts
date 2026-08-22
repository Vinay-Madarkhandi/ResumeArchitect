"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProfilePreferencesSchema } from "@/lib/schemas/profile";
import { RESUME_EXPORTS_BUCKET, RESUME_UPLOADS_BUCKET } from "@/lib/storage/paths";
import type { ActionResult } from "./onboarding";

export async function updatePreferences(input: unknown): Promise<ActionResult> {
  const parsed = ProfilePreferencesSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid preferences." };

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
  const existing =
    profile?.preferences && typeof profile.preferences === "object" && !Array.isArray(profile.preferences)
      ? profile.preferences
      : {};
  const merged = { ...existing, ...parsed.data };

  const { error } = await supabase.from("profiles").update({ preferences: merged }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Wipes every resume, job description, tailoring session, and profile field
 * belonging to the user, then sends them back through onboarding — this app
 * always expects a signed-in user to either be pre-onboarding or have a
 * master resume, so a full data wipe has to reset onboarding status too
 * rather than leaving the account in a state neither flow expects.
 * Deliberately does NOT delete the auth.users row itself (see the plan's
 * scope note on account deletion) — only owned application data.
 */
export async function deleteAllMyData(): Promise<ActionResult> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: resumes } = await supabase
    .from("resumes")
    .select("original_file_storage_path, pdf_storage_path")
    .eq("user_id", user.id);

  const uploadPaths = (resumes ?? []).map((r) => r.original_file_storage_path).filter((p): p is string => Boolean(p));
  const exportPaths = (resumes ?? []).map((r) => r.pdf_storage_path).filter((p): p is string => Boolean(p));

  if (uploadPaths.length > 0) await supabase.storage.from(RESUME_UPLOADS_BUCKET).remove(uploadPaths);
  if (exportPaths.length > 0) await supabase.storage.from(RESUME_EXPORTS_BUCKET).remove(exportPaths);

  await supabase.from("resumes").delete().eq("user_id", user.id);
  await supabase.from("tailoring_sessions").delete().eq("user_id", user.id);
  await supabase.from("job_descriptions").delete().eq("user_id", user.id);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: null,
      headline: null,
      phone: null,
      location: null,
      links: [],
      default_resume_id: null,
      onboarding_completed_at: null,
      gemini_key_ciphertext: null,
      gemini_key_last4: null,
      gemini_key_status: "not_configured",
      gemini_key_updated_at: null,
      gemini_key_validated_at: null,
      preferences: {},
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  redirect("/onboarding");
}
