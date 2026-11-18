import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { getResume } from "@/lib/data/resumes";
import { currentUser } from "@/lib/auth/current-user";
import { RefreshSession } from "@/components/auth/RefreshSession";
import { getJobDescription, listScanTargets } from "@/lib/data/job-descriptions";
import { getTailoringSession } from "@/lib/data/tailoring";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDocument } from "@/lib/documentConversion";
import { JobFactsSchema } from "@/lib/schemas/jobFacts";
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
  const { view, job } = await searchParams;
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

  const requestedJob = typeof job === "string" ? job : null;
  const [posting, targets, chosenPosting] = await Promise.all([
    resume.job_description_id ? getJobDescription(user.id, resume.job_description_id) : null,
    listScanTargets(user.id),
    requestedJob && requestedJob !== resume.job_description_id ? getJobDescription(user.id, requestedJob) : null,
  ]);
  if (requestedJob && !(chosenPosting || posting?.id === requestedJob)) notFound();
  const targetPosting = chosenPosting ?? posting;
  const targetFacts = JobFactsSchema.safeParse(targetPosting?.job_facts).data;
  const initialTarget = targetPosting && targetFacts ? {
    id: targetPosting.id, title: targetPosting.job_title || targetFacts.title, company: targetPosting.company,
    text: targetPosting.raw_text, url: targetPosting.source_url, facts: targetFacts,
  } : null;
  if (targetPosting && !targets.some((target) => target.id === targetPosting.id)) {
    targets.unshift({ id: targetPosting.id, title: targetPosting.job_title || "Untitled job", company: targetPosting.company, hasFacts: !!targetFacts });
  }
  const jobFacts = JobFactsSchema.safeParse(posting?.job_facts);

  const initialView = view === "review" || view === "edit" || view === "compare" || view === "letter" ? view : null;

  return (
    <>
      <RefreshSession />
      <AnnouncementBanner />
      <Workspace
      key={`${id}:${requestedJob ?? ""}`}
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
      jobText={posting?.raw_text ?? null}
      jobFacts={jobFacts.data ?? null}
      scanTargets={targets}
      initialJobId={targetPosting?.id ?? null}
      initialTarget={initialTarget}
      asOf={new Date().toISOString()}
      initialView={initialView}
      />
    </>
  );
}
