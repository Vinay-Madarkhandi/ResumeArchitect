import { notFound } from "next/navigation";
import { getTrackedJob } from "@/lib/data/jobs";
import { listResumes } from "@/lib/data/resumes";
import { getProfileStatus } from "@/lib/data/profiles";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import type { Metadata } from "next";
import { NewApplication } from "@/components/tailor/NewApplication";

export const metadata: Metadata = { title: "New application" };

export default async function NewApplicationPage({ searchParams }: PageProps<"/new">) {
  const { retry, job } = await searchParams;
  const user = await requireOnboardedUser();

  const [resumes, profile, tracked] = await Promise.all([
    listResumes(user.id, true), getProfileStatus(user.id),
    typeof job === "string" ? getTrackedJob(user.id, job) : null,
  ]);
  if (typeof job === "string" && !tracked) notFound();

  // Master first, then tailored resumes (tailoring a tailored copy is allowed).
  const sources = (resumes ?? [])
    .filter((r) => r.kind === "tailored" || r.is_default)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((r) => ({ id: r.id, title: r.title, kind: r.kind }));

  return (
    <NewApplication
      key={tracked?.id ?? "new"}
      sources={sources}
      tracked={tracked ? { id: tracked.id, title: tracked.title, company: tracked.company, description: tracked.description } : null}
      hasKey={profile?.gemini_key_status === "valid"}
      retryId={typeof retry === "string" ? retry : null}
    />
  );
}
