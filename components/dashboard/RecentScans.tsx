import Link from "next/link";
import { Check, ScanSearch } from "lucide-react";
import { EmptyState, Panel } from "@/components/dashboard/Panel";
import { buttonVariants } from "@/components/ui/Button";
import type { ScanSummary } from "@/lib/data/scans";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { TARGET_MATCH_RATE } from "@/lib/report/matchReport";

export function RecentScans({ scans }: { scans: ScanSummary[] }) {
  return (
    <Panel id="recent-scans" title="Recent scans" action={scans.length ? { href: "/scans", label: "All scans" } : undefined}>
      {scans.length ? (
        <ul className="divide-y divide-line">
          {scans.map((scan) => {
            const met = scan.matchRate >= TARGET_MATCH_RATE;
            return (
              <li key={scan.id}>
                <Link href={`/scan/${scan.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 hover:bg-hover">
                  <span className="min-w-0">
                    <span className="block truncate text-body font-medium text-ink">{scan.jobTitle || "Untitled job"}{scan.company && <span className="font-normal text-ink-3"> · {scan.company}</span>}</span>
                    <span className="block truncate text-small text-ink-3">{scan.resumeLabel} · {formatRelativeTime(new Date(scan.createdAt).toISOString())}</span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-mono text-lead font-medium text-ink tabular" aria-label={`Match rate ${scan.matchRate} percent`}>{scan.matchRate}%</span>
                    <span className={met ? "inline-flex items-center gap-1 text-label text-add" : "text-label text-ink-3"}>
                      {met ? <><Check className="size-3" aria-hidden /> Target met</> : <>Target <span className="font-mono tabular">{TARGET_MATCH_RATE}%</span></>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="Your match reports will collect here"
          actions={<Link href="/scan" className={buttonVariants({ size: "sm" })}><ScanSearch aria-hidden /> Scan a resume</Link>}
        >
          Each scan is saved with its match rate, so you can see whether your edits moved the number. A report shows hard
          and soft skills, searchability, formatting and recruiter tips for one job.
        </EmptyState>
      )}
    </Panel>
  );
}
