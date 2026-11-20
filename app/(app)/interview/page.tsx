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
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Interview prep studio"
        intro="Role-targeted behavioral, technical, and architectural questions with strict interviewer rubrics. Measure your spoken or typed answers against deterministic scoring criteria."
      />
      {!hasKey && <KeyMissing what="write interview questions and rate your answers" />}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-6">
          <InterviewForm applications={applications} hasKey={hasKey} />
        </div>

        <aside className="flex flex-col gap-6">
          {/* Rubric Evaluation Blueprint */}
          <div className="rounded-xl border border-line bg-panel/75 p-6 shadow-xs backdrop-blur-xs">
            <h2 className="text-lead font-semibold text-ink">Evaluation Matrix</h2>
            <p className="mt-1 text-small text-ink-3">
              Every generated question is paired with a quantitative three-point evaluation rubric.
            </p>

            <ul className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>STAR Framework & Execution</span>
                  <span className="font-mono text-brass tabular">40 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[40%] rounded-full bg-brass" />
                </div>
                <p className="text-label text-ink-3">Concrete situation, personal ownership, actions taken, and measured outcome.</p>
              </li>

              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>Technical Depth & Trade-offs</span>
                  <span className="font-mono text-ink-2 tabular">35 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[35%] rounded-full bg-ink-2" />
                </div>
                <p className="text-label text-ink-3">Architectural reasoning, system constraints, failure modes, and metrics.</p>
              </li>

              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>Role & Values Alignment</span>
                  <span className="font-mono text-ink-3 tabular">25 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[25%] rounded-full bg-line-strong" />
                </div>
                <p className="text-label text-ink-3">Domain fluency, collaborative velocity, and requirement synthesis.</p>
              </li>
            </ul>
          </div>

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
        </aside>
      </div>
    </div>
  );
}

