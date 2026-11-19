import Link from "next/link";
import { Columns3, Plug } from "lucide-react";
import { EmptyState, Panel } from "@/components/dashboard/Panel";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import type { TrackerJob } from "@/lib/data/jobs";
import { stageLabels, type ApplicationStatus } from "@/lib/tracker/stages";

const ACTIVE: readonly ApplicationStatus[] = ["saved", "applied", "interviewing", "offer"];

export const activeJobs = (jobs: TrackerJob[]) => jobs.filter((job) => !job.archived && ACTIVE.includes(job.stage));

export function ActiveApplications({ jobs }: { jobs: TrackerJob[] }) {
  const active = activeJobs(jobs);
  return (
    <Panel id="active-applications" title="Active applications" count={active.length} action={active.length ? { href: "/tracker", label: "Job tracker" } : undefined}>
      {active.length ? (
        <ul className="divide-y divide-line">
          {active.slice(0, 5).map((job) => (
            <li key={job.id}>
              <Link href={`/tracker?job=${job.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 hover:bg-hover">
                <span className="min-w-0">
                  <span className="block truncate text-body font-medium text-ink">{job.title}</span>
                  <span className="block truncate text-small text-ink-3">{job.company || "Company not named"}</span>
                </span>
                <span className="flex items-center gap-2">
                  {job.matchRate !== null && <span className="font-mono text-small text-ink-2 tabular" aria-label={`Match rate ${job.matchRate} percent`}>{job.matchRate}%</span>}
                  <Badge tone={job.stage === "offer" ? "add" : job.stage === "interviewing" ? "brass" : "neutral"}>{stageLabels[job.stage]}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Track the jobs you're going after"
          actions={
            <>
              <Link href="/tracker" className={buttonVariants({ size: "sm" })}><Columns3 aria-hidden /> Open the job tracker</Link>
              <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}><Plug aria-hidden /> Set up the browser clipper</Link>
            </>
          }
        >
          Move each posting through Saved, Applied, Interviewing and Offer, with its notes, contacts and follow-up dates.
          The clipper saves a posting from any job page in one click.
        </EmptyState>
      )}
    </Panel>
  );
}
