import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { ActiveApplications } from "@/components/dashboard/ActiveApplications";
import { CareerTools } from "@/components/dashboard/CareerTools";
import { FailedRun } from "@/components/dashboard/FailedRun";
import { EmptyState, Panel } from "@/components/dashboard/Panel";
import { RecentScans } from "@/components/dashboard/RecentScans";
import { ScanLead } from "@/components/dashboard/ScanLead";
import { buttonVariants } from "@/components/ui/Button";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { listJobs } from "@/lib/data/jobs";
import { getProfileStatus } from "@/lib/data/profiles";
import { listResumes } from "@/lib/data/resumes";
import { listScans } from "@/lib/data/scans";
import { latestFailedTailoring } from "@/lib/data/tailoring";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

export const metadata: Metadata = { title: "Dashboard" };

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const [resumes, profile, scans, jobs, failed] = await Promise.all([
    listResumes(user.id), getProfileStatus(user.id), listScans(user.id, 5), listJobs(user.id), latestFailedTailoring(user.id, hoursAgo(24)),
  ]);

  const master = resumes.find((r) => r.kind === "master" && r.is_default) ?? null;
  const tailored = resumes.filter((r) => r.kind === "tailored" && r.status !== "archived");

  return (
    <div className="flex flex-col gap-6">
      <ScanLead setup={{ keyConnected: profile?.gemini_key_status === "valid", hasResume: master !== null, hasScan: scans.length > 0 }} />
      {failed && <FailedRun id={failed.id} message={failed.error_message} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <RecentScans scans={scans} />
        <ActiveApplications jobs={jobs} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="your-resumes" title="Resumes" count={tailored.length + (master ? 1 : 0)} action={{ href: "/resumes", label: "All resumes" }}>
          {master || tailored.length ? (
            <ul className="divide-y divide-line">
              {[...(master ? [master] : []), ...tailored.slice(0, 3)].map((resume) => (
                <li key={resume.id}>
                  <Link href={`/resumes/${resume.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-hover">
                    <FileText className="size-4 shrink-0 text-ink-3" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium text-ink">{resume.kind === "master" ? resume.title : resume.job_title_snapshot ?? resume.title}</span>
                      <span className="block truncate text-small text-ink-3">
                        {resume.kind === "master" ? "Master resume" : resume.job_company_snapshot ?? "Tailored for a job"} · edited {formatRelativeTime(resume.updated_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No resume yet"
              actions={
                <>
                  <Link href="/onboarding/resume" className={buttonVariants({ variant: "primary", size: "sm" })}>Import a file</Link>
                  <Link href="/onboarding/build" className={buttonVariants({ size: "sm" })}>Build one</Link>
                </>
              }
            >
              Scans and tailoring start from a master resume. Import a PDF or Word file, or build one step by step.
            </EmptyState>
          )}
          <div className="mt-auto border-t border-line px-4 py-2.5">
            <Link href="/new" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <Plus aria-hidden /> Tailor a resume to a job
            </Link>
          </div>
        </Panel>
        <CareerTools />
      </div>
    </div>
  );
}
