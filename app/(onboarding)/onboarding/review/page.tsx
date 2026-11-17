import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
import { ReviewMaster } from "@/components/onboarding/ReviewMaster";

export const metadata: Metadata = { title: "Check your resume" };

export default async function ReviewPage({ searchParams }: PageProps<"/onboarding/review">) {
  const { resumeId } = await searchParams;
  if (typeof resumeId !== "string") redirect("/onboarding/resume");

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, title, content, kind, original_file_name")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .single();
  if (!resume || resume.kind !== "master") notFound();
  const content = resolveDocument(resume.content);
  if (!content) notFound();

  const { data: profile } = await supabase.from("profiles").select("gemini_key_status").eq("id", user.id).single();

  return (
    <ReviewMaster
      resumeId={resume.id}
      initialTitle={resume.title}
      initialContent={content}
      usedAi={profile?.gemini_key_status === "valid"}
    />
  );
}
