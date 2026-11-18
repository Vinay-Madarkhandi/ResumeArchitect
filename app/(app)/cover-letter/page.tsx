import type { Metadata } from "next";
import { CoverLetterForm } from "@/components/career/CoverLetterForm";
import { History, KeyMissing, PageHeading } from "@/components/career/Report";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { listCoverLetterScans } from "@/lib/data/cover-letter-scans";
import { getProfileStatus } from "@/lib/data/profiles";
import { listApplications } from "@/lib/data/resumes";
import { applicationLabel } from "@/lib/server/careerPages";

export const metadata: Metadata = { title: "Cover letter scan" };

export default async function CoverLetterScanPage({ searchParams }: PageProps<"/cover-letter">) {
  const { application } = await searchParams;
  const user = await requireOnboardedUser();
  const [profile, applications, history] = await Promise.all([
    getProfileStatus(user.id), listApplications(user.id), listCoverLetterScans(user.id),
  ]);
  const hasKey = profile?.gemini_key_status === "valid";
  return (
    <div className="flex flex-col gap-10">
      <PageHeading
        title="Cover letter scan"
        intro="Measure a letter against the job: which requirements it mentions, whether it names the company and role, backs a claim with a number, and avoids stock phrases."
      />
      {!hasKey && <KeyMissing what="scan against a pasted job post" />}
      <CoverLetterForm
        applications={applications.map((a) => ({ id: a.id, label: applicationLabel(a), letter: a.cover_letter }))}
        hasKey={hasKey}
        preselect={typeof application === "string" ? application : null}
      />
      <History
        title="Past scans"
        href={(id) => `/cover-letter/${id}`}
        items={history.map((s) => ({ id: s.id, label: s.target_label, score: s.score, created_at: s.created_at }))}
      />
    </div>
  );
}
