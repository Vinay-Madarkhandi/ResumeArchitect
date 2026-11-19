import { notFound } from "next/navigation";
import { getJobDescription } from "@/lib/data/job-descriptions";
import { getResume, listResumes } from "@/lib/data/resumes";
import { getProfileStatus } from "@/lib/data/profiles";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import type { Metadata } from "next";
import { NewApplication } from "@/components/tailor/NewApplication";

export const metadata: Metadata = { title: "New application" };

export default async function NewApplicationPage({ searchParams }: PageProps<"/new">) {
  const { retry, job, resume } = await searchParams;
  const user = await requireOnboardedUser();

  const [resumes, profile, posting, selectedResume] = await Promise.all([
    listResumes(user.id, true), getProfileStatus(user.id),
    typeof job === "string" ? getJobDescription(user.id, job) : null,
    typeof resume === "string" ? getResume(user.id, resume) : null,
  ]);
  if ((typeof job === "string" && !posting) || (typeof resume === "string" && !selectedResume)) notFound();

  // Master first, then tailored resumes (tailoring a tailored copy is allowed).
  const sources = (resumes ?? [])
    .filter((r) => r.id === resume || r.kind === "tailored" || r.is_default)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((r) => ({ id: r.id, title: r.title, kind: r.kind }));
  if (selectedResume && !sources.some((r) => r.id === selectedResume.id)) {
    sources.unshift({ id: selectedResume.id, title: selectedResume.title, kind: selectedResume.kind });
  }

  return (
    <NewApplication
      key={`${posting?.id ?? "new"}:${typeof resume === "string" ? resume : ""}`}
      sources={sources}
      initialSourceId={sources.find((s) => s.id === resume)?.id}
      posting={posting ? {
        id: posting.id, title: posting.job_title || "Untitled job", company: posting.company || "",
        description: posting.raw_text, inTracker: posting.tracker_stage !== null,
      } : null}
      hasKey={profile?.gemini_key_status === "valid"}
      retryId={typeof retry === "string" ? retry : null}
    />
  );
}
