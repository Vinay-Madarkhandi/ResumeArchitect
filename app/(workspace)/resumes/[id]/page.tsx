import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { getResume } from "@/lib/data/resumes";
import { currentUser } from "@/lib/auth/current-user";
import { RefreshSession } from "@/components/auth/RefreshSession";
import { getJobDescription } from "@/lib/data/job-descriptions";
import { getTailoringSession } from "@/lib/data/tailoring";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDocument } from "@/lib/documentConversion";
import { SessionArtifactsSchema } from "@/lib/schemas/tailoring";
import { Workspace } from "@/components/workspace/Workspace";

export async function generateMetadata({ params }: PageProps<"/resumes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await currentUser();
  const data = user ? await getResume(user.id, id) : null;
  return { title: data?.title ?? "Resume" };
}

export default async function ResumePage({ params, searchParams }: PageProps<"/resumes/[id]">) {
  const { id } = await params;
  const { view } = await searchParams;
  const user = await requireOnboardedUser();

  const resume = await getResume(user.id, id);
  if (!resume) notFound();

  const content = resolveDocument(resume.content);
  if (!content) notFound();

  let session = null;
  if (resume.tailoring_session_id) {
    const data = await getTailoringSession(user.id, resume.tailoring_session_id);
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

  let jobText: string | null = null;
  if (resume.job_description_id) {
    const data = await getJobDescription(user.id, resume.job_description_id);
    jobText = data?.raw_text ?? null;
  }

  const initialView = view === "review" || view === "edit" || view === "compare" || view === "letter" ? view : null;

  return (
    <>
      <RefreshSession />
      <AnnouncementBanner />
      <Workspace
      resume={{
        id: resume.id,
        title: resume.title,
        kind: resume.kind,
        content,
        template: resume.template,
        reviewedChangeIds: resume.reviewed_change_ids,
        applicationStatus: resume.application_status,
        coverLetter: resume.cover_letter,
        keepsWordDesign: !!resume.design_source_path,
      }}
      session={session}
      jobText={jobText}
      initialView={initialView}
      />
    </>
  );
}
