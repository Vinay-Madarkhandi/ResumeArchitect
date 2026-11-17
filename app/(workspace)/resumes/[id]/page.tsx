import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
import { SessionArtifactsSchema } from "@/lib/schemas/tailoring";
import { Workspace } from "@/components/workspace/Workspace";

export async function generateMetadata({ params }: PageProps<"/resumes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data } = await supabase.from("resumes").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Resume" };
}

export default async function ResumePage({ params, searchParams }: PageProps<"/resumes/[id]">) {
  const { id } = await params;
  const { view } = await searchParams;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?redirect=/resumes/${id}`);

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, title, kind, content, template, reviewed_change_ids, tailoring_session_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!resume) notFound();

  const content = resolveDocument(resume.content);
  if (!content) notFound();

  let session = null;
  if (resume.tailoring_session_id) {
    const { data } = await supabase
      .from("tailoring_sessions")
      .select("job_analysis, source_snapshot, changes, summary, score_before")
      .eq("id", resume.tailoring_session_id)
      .maybeSingle();
    // v1 sessions lack the analysis/snapshot; they open as plain documents.
    const parsed = SessionArtifactsSchema.safeParse({
      jobAnalysis: data?.job_analysis,
      sourceSnapshot: data?.source_snapshot,
      changes: data?.changes ?? [],
      summary: data?.summary ?? null,
      scoreBefore: data?.score_before ?? null,
    });
    if (parsed.success) session = parsed.data;
  }

  const initialView = view === "review" || view === "edit" || view === "compare" ? view : null;

  return (
    <Workspace
      resume={{
        id: resume.id,
        title: resume.title,
        kind: resume.kind,
        content,
        template: resume.template,
        reviewedChangeIds: resume.reviewed_change_ids,
      }}
      session={session}
      initialView={initialView}
    />
  );
}
