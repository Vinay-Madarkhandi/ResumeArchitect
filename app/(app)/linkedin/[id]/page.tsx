import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CheckList, KeyMissing, KeywordList, ScoreCard } from "@/components/career/Report";
import { LinkedInSuggestions } from "@/components/career/LinkedInSuggestions";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { SECTION_LABELS } from "@/lib/career/linkedin";
import { getLinkedInReview } from "@/lib/data/linkedin-reviews";
import { getProfileStatus } from "@/lib/data/profiles";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { LinkedInReportSchema, LinkedInSuggestionsSchema } from "@/lib/schemas/career";

export const metadata: Metadata = { title: "LinkedIn review" };

export default async function LinkedInReviewPage({ params }: PageProps<"/linkedin/[id]">) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const [review, profile] = await Promise.all([getLinkedInReview(user.id, id), getProfileStatus(user.id)]);
  const report = LinkedInReportSchema.safeParse(review?.report);
  if (!review || !report.success) notFound();
  const suggestions = LinkedInSuggestionsSchema.safeParse(review.suggestions);
  const hasKey = profile?.gemini_key_status === "valid";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/linkedin" className="inline-flex items-center gap-1.5 text-small text-ink-3 hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> LinkedIn review
        </Link>
        <h1 className="mt-2 text-page font-semibold tracking-[-0.015em]">{review.target_label ?? "Profile review"}</h1>
        <p className="mt-1.5 text-body text-ink-2">Reviewed {formatRelativeTime(review.created_at)}.</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <CheckList title="Profile checks" checks={report.data.checks} />
          {report.data.keywords && <KeywordList hits={report.data.keywords} places={SECTION_LABELS} />}
          {!hasKey && <KeyMissing what="get headline and About suggestions" />}
          <LinkedInSuggestions reviewId={review.id} initial={suggestions.success ? suggestions.data : null} hasKey={hasKey} />
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <ScoreCard score={report.data.score} label="Profile strength" context={review.target_label} />
        </aside>
      </div>
    </div>
  );
}
