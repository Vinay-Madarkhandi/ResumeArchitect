import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ResumeContentSchema } from "@/lib/schemas/resume";
import { DocumentContentSchema, type DocumentContent } from "@/lib/schemas/document";
import { resumeContentToDoc } from "@/lib/documentConversion";
import { ChangeExplanationSchema } from "@/lib/schemas/tailoring";
import { z } from "zod";
import { ResumeEditorClient } from "@/components/editor/ResumeEditorClient";

/**
 * `resumes.content` can hold either shape — the new freeform document, or
 * the legacy typed ResumeContent from before this editor existed — with no
 * DB migration involved. A legacy row is converted here on read; the editor
 * persists it back in the new shape on its first autosave, so every resume
 * upgrades the moment someone actually opens it, with no batch migration.
 */
function resolveDocument(content: unknown): DocumentContent | null {
  const asDoc = DocumentContentSchema.safeParse(content);
  if (asDoc.success) return asDoc.data;

  const asLegacy = ResumeContentSchema.safeParse(content);
  if (asLegacy.success) return resumeContentToDoc(asLegacy.data);

  return null;
}

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
      if (source) {
        // The comparison rail (OriginalComparisonPanel) is still typed to
        // the legacy ResumeContent shape until Stage C rebuilds it around
        // documents — if the source resume has itself already been opened
        // and upgraded to the new document shape, this simply omits the
        // comparison rather than showing mismatched data. The editor itself
        // is unaffected either way.
        const parsedSource = ResumeContentSchema.safeParse(source.content);
        if (parsedSource.success) sourceContent = parsedSource.data;
      }
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
