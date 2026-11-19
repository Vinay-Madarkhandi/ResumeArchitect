import type { Metadata } from "next";
import { History, KeyMissing, PageHeading } from "@/components/career/Report";
import { LinkedInForm } from "@/components/career/LinkedInForm";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { listLinkedInReviews } from "@/lib/data/linkedin-reviews";
import { getProfileStatus } from "@/lib/data/profiles";
import { applicationOptions } from "@/lib/server/careerPages";

export const metadata: Metadata = { title: "LinkedIn review" };

export default async function LinkedInPage() {
  const user = await requireOnboardedUser();
  const [profile, applications, history] = await Promise.all([
    getProfileStatus(user.id), applicationOptions(user.id), listLinkedInReviews(user.id),
  ]);
  const hasKey = profile?.gemini_key_status === "valid";
  return (
    <div className="flex flex-col gap-10">
      <PageHeading
        title="LinkedIn review"
        intro="Paste your profile's sections. See which of the role's keywords recruiters can find, what's missing from a complete profile, and get headline and About drafts built from your resume."
      />
      {!hasKey && <KeyMissing what="measure against a pasted job post or role, and get headline and About suggestions" />}
      <LinkedInForm applications={applications} hasKey={hasKey} />
      <History
        title="Past reviews"
        href={(id) => `/linkedin/${id}`}
        items={history.map((r) => ({ id: r.id, label: r.target_label ?? "No target", score: r.score, created_at: r.created_at }))}
      />
    </div>
  );
}
