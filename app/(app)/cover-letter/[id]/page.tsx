import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PenLine, RefreshCw } from "lucide-react";
import { CheckList, KeywordList, ScoreCard } from "@/components/career/Report";
import { buttonVariants } from "@/components/ui/Button";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { clicheSpans } from "@/lib/career/coverLetter";
import { getCoverLetterScan } from "@/lib/data/cover-letter-scans";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { CoverLetterReportSchema } from "@/lib/schemas/career";

export const metadata: Metadata = { title: "Cover letter scan" };

export default async function CoverLetterReportPage({ params }: PageProps<"/cover-letter/[id]">) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const scan = await getCoverLetterScan(user.id, id);
  const report = CoverLetterReportSchema.safeParse(scan?.report);
  if (!scan || !report.success) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/cover-letter" className="inline-flex items-center gap-1.5 text-small text-ink-3 hover:text-ink">
            <ArrowLeft className="size-3.5" aria-hidden /> Cover letter scan
          </Link>
          <h1 className="mt-2 text-page font-semibold tracking-[-0.015em]">{scan.target_label}</h1>
          <p className="mt-1.5 text-body text-ink-2">Scanned {formatRelativeTime(scan.created_at)}.</p>
        </div>
        {scan.resume_id && (
          <div className="flex gap-2">
            <Link href={`/resumes/${scan.resume_id}?view=letter`} className={buttonVariants({ size: "sm" })}>
              <PenLine aria-hidden /> Edit the letter
            </Link>
            <Link href={`/cover-letter?application=${scan.resume_id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
              <RefreshCw aria-hidden /> Scan again
            </Link>
          </div>
        )}
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <CheckList title="Letter checks" checks={report.data.checks} />
          <KeywordList hits={report.data.keywords} />
          <section aria-labelledby="letter-heading">
            <h2 id="letter-heading" className="text-small font-medium text-ink-2">
              The letter{report.data.cliches.length > 0 && <span className="font-normal text-ink-3"> · clichés struck through</span>}
            </h2>
            <div className="mt-2 rounded-lg border border-line bg-panel px-5 py-4">
              <p className="whitespace-pre-line text-body text-ink-2">
                {clicheSpans(scan.letter, report.data.cliches).map((span, i) =>
                  span.cliche ? (
                    <del key={i} title="Cliché" className="rounded-[2px] bg-del-soft text-del decoration-del decoration-[1.5px]">
                      {span.text}
                    </del>
                  ) : (
                    <span key={i}>{span.text}</span>
                  ),
                )}
              </p>
            </div>
          </section>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <ScoreCard score={report.data.score} label="Letter match" context={`${report.data.words} words`} />
        </aside>
      </div>
    </div>
  );
}
