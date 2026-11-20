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
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Cover letter diagnostic studio"
        intro="Measure letter specificity against target job postings: requirement citations, quantitative proof density, company alignment, and anti-cliché inspection."
      />
      {!hasKey && <KeyMissing what="scan against a pasted job post" />}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-6">
          <CoverLetterForm
            applications={applications.map((a) => ({ id: a.id, label: applicationLabel(a), letter: a.cover_letter }))}
            hasKey={hasKey}
            preselect={typeof application === "string" ? application : null}
          />
        </div>

        <aside className="flex flex-col gap-6">
          {/* Diagnostic Blueprint */}
          <div className="rounded-xl border border-line bg-panel/75 p-6 shadow-xs backdrop-blur-xs">
            <h2 className="text-lead font-semibold text-ink">Letter Scoring Criteria</h2>
            <p className="mt-1 text-small text-ink-3">
              Standard recruiter evaluation rubric for targeted outbound applications.
            </p>

            <ul className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>Requirement Coverage</span>
                  <span className="font-mono text-brass tabular">45 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[45%] rounded-full bg-brass" />
                </div>
                <p className="text-label text-ink-3">Direct mapping of candidate competencies to mandatory job requirements.</p>
              </li>

              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>Quantitative Evidence</span>
                  <span className="font-mono text-ink-2 tabular">30 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[30%] rounded-full bg-ink-2" />
                </div>
                <p className="text-label text-ink-3">Specific metrics, revenue figures, percentage improvements, and team sizes.</p>
              </li>

              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>Anti-Cliché & Voice Tone</span>
                  <span className="font-mono text-ink-3 tabular">25 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[25%] rounded-full bg-line-strong" />
                </div>
                <p className="text-label text-ink-3">Eliminates generic boilerplate phrases and robotic filler prose.</p>
              </li>
            </ul>
          </div>

          <History
            title="Past scans"
            href={(id) => `/cover-letter/${id}`}
            items={history.map((s) => ({ id: s.id, label: s.target_label, score: s.score, created_at: s.created_at }))}
          />
        </aside>
      </div>
    </div>
  );
}

