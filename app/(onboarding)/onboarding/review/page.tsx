import { getResume } from "@/lib/data/resumes";
import { getProfileStatus } from "@/lib/data/profiles";
import { requireUser } from "@/lib/auth/current-user";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveDocument } from "@/lib/documentConversion";
import { ReviewMaster } from "@/components/onboarding/ReviewMaster";

export const metadata: Metadata = { title: "Check your resume" };

export default async function ReviewPage({ searchParams }: PageProps<"/onboarding/review">) {
  const { resumeId } = await searchParams;
  if (typeof resumeId !== "string") redirect("/onboarding/resume");

  const user = await requireUser();

  const resume = await getResume(user.id, resumeId);
  if (!resume || resume.kind !== "master") notFound();
  const content = resolveDocument(resume.content);
  if (!content) notFound();

  const profile = await getProfileStatus(user.id);

  return (
    <ReviewMaster
      resumeId={resume.id}
      initialTitle={resume.title}
      initialContent={content}
      usedAi={profile?.gemini_key_status === "valid"}
    />
  );
}
