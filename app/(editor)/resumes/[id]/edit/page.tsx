import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
import { ChangeExplanationSchema } from "@/lib/schemas/tailoring";
import { z } from "zod";
import { ResumeEditorClient } from "@/components/editor/ResumeEditorClient";

export default async function ResumeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: resume } = await supabase
    .from("resumes")
    .select(
      "id, user_id, kind, title, content, is_default, source_resume_id, job_title_snapshot, job_company_snapshot, tailoring_session_id",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume) notFound();

  const initialDoc = resolveDocument(resume.content);
  if (!initialDoc) notFound();

  let sourceContent = null;
  let changes = null;

  if (resume.kind === "tailored") {
    if (resume.source_resume_id) {
      const { data: source } = await supabase
        .from("resumes")
        .select("content")
        .eq("id", resume.source_resume_id)
        .eq("user_id", user.id)
        .single();
      if (source) sourceContent = resolveDocument(source.content);
    }
    if (resume.tailoring_session_id) {
      const { data: session } = await supabase
        .from("tailoring_sessions")
        .select("change_explanations")
        .eq("id", resume.tailoring_session_id)
        .eq("user_id", user.id)
        .single();
      const parsedChanges = z.array(ChangeExplanationSchema).safeParse(session?.change_explanations);
      if (parsedChanges.success) changes = parsedChanges.data;
    }
    if (!changes) changes = [];
  }

  return (
    <ResumeEditorClient
      resumeId={resume.id}
      title={resume.title}
      isDefault={resume.is_default}
      initialDoc={initialDoc}
      sourceContent={sourceContent}
      jobTitleSnapshot={resume.job_title_snapshot}
      jobCompanySnapshot={resume.job_company_snapshot}
      changes={changes}
    />
  );
}
