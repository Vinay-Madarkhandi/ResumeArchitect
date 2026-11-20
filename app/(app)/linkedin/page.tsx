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
    <div className="flex flex-col gap-8">
      <PageHeading
        title="LinkedIn profile optimizer"
        intro="Inspect candidate discoverability against recruiter search queries: keyword density in headline and About sections, role alignment, and missing competencies."
      />
      {!hasKey && <KeyMissing what="measure against a pasted job post or role, and get headline and About suggestions" />}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-6">
          <LinkedInForm applications={applications} hasKey={hasKey} />
        </div>

        <aside className="flex flex-col gap-6">
          {/* Recruiter Visibility Matrix */}
          <div className="rounded-xl border border-line bg-panel/75 p-6 shadow-xs backdrop-blur-xs">
            <h2 className="text-lead font-semibold text-ink">Recruiter Indexing Rubric</h2>
            <p className="mt-1 text-small text-ink-3">
              Core factors LinkedIn Recruiter search algorithms rank for candidate sourcing.
            </p>

            <ul className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>Headline Keyword Density</span>
                  <span className="font-mono text-brass tabular">40 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[40%] rounded-full bg-brass" />
                </div>
                <p className="text-label text-ink-3">Exact title match, primary tooling tokens, and industry domain identifiers.</p>
              </li>

              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>About Section Narrative</span>
                  <span className="font-mono text-ink-2 tabular">35 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[35%] rounded-full bg-ink-2" />
                </div>
                <p className="text-label text-ink-3">Value proposition, notable scale metrics, and core technology stack index.</p>
              </li>

              <li className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-small font-medium text-ink">
                  <span>Profile Completeness Invariants</span>
                  <span className="font-mono text-ink-3 tabular">25 pts</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-sunken">
                  <div className="h-full w-[25%] rounded-full bg-line-strong" />
                </div>
                <p className="text-label text-ink-3">Verified location, comprehensive role chronology, and skills endorsement count.</p>
              </li>
            </ul>
          </div>

          <History
            title="Past reviews"
            href={(id) => `/linkedin/${id}`}
            items={history.map((r) => ({ id: r.id, label: r.target_label ?? "No target", score: r.score, created_at: r.created_at }))}
          />
        </aside>
      </div>
    </div>
  );
}

