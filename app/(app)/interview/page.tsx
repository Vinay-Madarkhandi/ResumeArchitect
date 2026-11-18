import type { Metadata } from "next";
import { InterviewForm } from "@/components/career/InterviewForm";
import { History, KeyMissing, PageHeading } from "@/components/career/Report";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { listInterviewSessions } from "@/lib/data/interview";
import { getProfileStatus } from "@/lib/data/profiles";
import { applicationOptions } from "@/lib/server/careerPages";

export const metadata: Metadata = { title: "Interview prep" };

export default async function InterviewPage() {
  const user = await requireOnboardedUser();
  const [profile, applications, history] = await Promise.all([
    getProfileStatus(user.id), applicationOptions(user.id), listInterviewSessions(user.id),
  ]);
  const hasKey = profile?.gemini_key_status === "valid";
  return (
    <div className="flex flex-col gap-10">
      <PageHeading
        title="Interview prep"
        intro="Behavioral, technical and role questions for one job, each with what the interviewer is listening for. Type or dictate an answer and get feedback against a fixed rubric."
      />
      {!hasKey && <KeyMissing what="write interview questions and rate your answers" />}
      <InterviewForm applications={applications} hasKey={hasKey} />
      <History
        title="Practice sessions"
        href={(id) => `/interview/${id}`}
        items={history.map((s) => ({
          id: s.id,
          label: s.target_label,
          score: s.best,
          note: `${s.answers} answer${s.answers === 1 ? "" : "s"}`,
          created_at: s.created_at,
        }))}
      />
    </div>
  );
}
