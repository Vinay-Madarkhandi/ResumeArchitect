import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ReportSections } from "@/components/scan/ReportSections";
import { ScanActions } from "@/components/scan/ScanActions";
import { Breakdown, MatchRateFigure } from "@/components/scan/reportParts";
import { detectAts } from "@/lib/ats";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { getScan } from "@/lib/data/scans";

export const metadata: Metadata = { title: "Match report" };

export default async function MatchReportPage({ params }: PageProps<"/scan/[id]">) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const scan = await getScan(user.id, id);
  if (!scan) notFound();
  const { report } = scan;
  const ats = detectAts({ text: scan.jobText, url: scan.jobUrl });

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <header className="grid gap-3">
        <Link href="/scans" className="inline-flex w-fit items-center gap-1.5 text-small text-brass hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> Scan history
        </Link>
        <div>
          <h1 className="text-page font-semibold">Match report</h1>
          <p className="mt-1 text-lead text-ink">{scan.jobTitle || "Untitled job"}{scan.company && ` · ${scan.company}`}</p>
          <p className="text-small text-ink-3">{scan.resumeLabel} · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(scan.createdAt))}</p>
        </div>
        <ScanActions scanId={id} tracked={scan.tracked} jobId={scan.jobId} />
      </header>
      {report.breakdown ? (
        <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <section aria-label="Score breakdown" className="rounded-lg border border-line bg-panel p-5">
            <MatchRateFigure rate={report.matchRate} target={report.verdict.target} />
            <h2 className="mb-3 mt-5 border-t border-line pt-4 text-body font-semibold">Score breakdown</h2>
            <Breakdown components={report.breakdown} />
          </section>
          <ReportSections report={report} ats={ats} />
        </div>
      ) : (
        <p className="rounded-lg border border-line bg-panel p-5 text-body">{scan.matchRate}% match. Re-scan to get a full breakdown with the current scoring model.</p>
      )}
    </div>
  );
}
