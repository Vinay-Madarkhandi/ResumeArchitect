import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, FileText, Plus } from "lucide-react";
import { ApplicationsTable, type ApplicationRow } from "@/components/dashboard/ApplicationsTable";
import { FailedRun } from "@/components/dashboard/FailedRun";
import { ResumeActions } from "@/components/dashboard/ResumeActions";
import { buttonVariants } from "@/components/ui/Button";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { getProfileStatus } from "@/lib/data/profiles";
import { listResumes } from "@/lib/data/resumes";
import { getTailoringScores, latestFailedTailoring } from "@/lib/data/tailoring";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { TailoredChange } from "@/lib/schemas/tailoring";

export const metadata: Metadata = { title: "Resumes" };

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export default async function ResumesPage() {
  const user = await requireOnboardedUser();
  const [resumes, profile] = await Promise.all([listResumes(user.id), getProfileStatus(user.id)]);

  const master = resumes.find((r) => r.kind === "master" && r.is_default) ?? null;
  const applications = resumes.filter((r) => r.kind === "tailored");
  const sessions = await getTailoringScores(user.id, applications.map((a) => a.tailoring_session_id).filter((x): x is string => !!x));
  const byId = new Map(sessions.map((session) => [session.id, session]));
  const failed = await latestFailedTailoring(user.id, hoursAgo(24));
  const keyMissing = profile?.gemini_key_status !== "valid";

  const rows: ApplicationRow[] = applications.map((a) => {
    const s = a.tailoring_session_id ? byId.get(a.tailoring_session_id) : undefined;
    const changes = (s?.changes ?? []) as TailoredChange[];
    return {
      id: a.id,
      title: a.title,
      role: a.job_title_snapshot ?? a.title,
      company: a.job_company_snapshot,
      status: a.application_status,
      before: s?.score_before ?? null,
      after: s?.score_after ?? null,
      changes: changes.length,
      toVerify: changes.filter((c) => c.flags.length > 0).length,
      updatedLabel: formatRelativeTime(a.updated_at),
    };
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page font-semibold tracking-[-0.015em]">Resumes</h1>
          <p className="mt-1.5 max-w-2xl text-body text-ink-2">
            One master resume to start from, and a tailored copy for each job you apply to. The master is never changed by
            tailoring.
          </p>
        </div>
        <Link href="/new" className={buttonVariants({ variant: "primary" })}>
          <Plus aria-hidden /> New application
        </Link>
      </div>

      {keyMissing && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-brass/40 bg-brass-soft px-4 py-3 text-body">
          <CircleAlert className="size-4 text-brass" aria-hidden />
          <p className="flex-1 text-ink">Tailoring runs on your Gemini key. Connect one to rewrite a resume for a job.</p>
          <Link href="/settings" className={buttonVariants({ size: "sm" })}>
            Connect a key
          </Link>
        </div>
      )}

      {failed && <FailedRun id={failed.id} message={failed.error_message} />}

      <section aria-labelledby="master-heading">
        <h2 id="master-heading" className="mb-3 text-small font-medium text-ink-3">
          Master resume
        </h2>
        {master ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-panel px-4 py-3.5">
            <FileText className="hidden size-5 text-ink-3 sm:block" aria-hidden />
            <div className="min-w-0 flex-1 basis-56">
              <Link href={`/resumes/${master.id}`} className="block truncate text-lead font-medium text-ink hover:underline">
                {master.title}
              </Link>
              <p className="text-small text-ink-3">
                Edited {formatRelativeTime(master.updated_at)}
                <span className="hidden sm:inline"> · scanned and tailored from here</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/onboarding/build" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Build a new one
              </Link>
              <Link href="/onboarding/resume" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Replace with a file
              </Link>
              <Link href={`/resumes/${master.id}`} className={buttonVariants({ size: "sm" })}>
                Edit
              </Link>
              <ResumeActions id={master.id} title={master.title} deletable={false} />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-line-strong px-4 py-4">
            <p className="text-body text-ink-2">Add the resume you&rsquo;ll scan and tailor from.</p>
            <div className="flex gap-2">
              <Link href="/onboarding/build" className={buttonVariants({ size: "sm" })}>
                Build one
              </Link>
              <Link href="/onboarding/resume" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Import a file
              </Link>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="apps-heading">
        <h2 id="apps-heading" className="mb-3 text-small font-medium text-ink-3">
          Tailored for a job <span className="font-mono tabular">· {applications.length}</span>
        </h2>
        {applications.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center">
            <p className="text-title font-semibold text-ink">Tailor your first application</p>
            <p className="mx-auto mt-2 max-w-md text-body text-ink-2">
              Paste a job post. Gemini reads it, rewrites your resume&rsquo;s lines to fit, checks nothing was invented, and
              shows you every change with its reason. Each one is saved here with its score.
            </p>
            <Link href="/new" className={`${buttonVariants({ variant: "primary" })} mt-6`}>
              <Plus aria-hidden /> New application
            </Link>
          </div>
        ) : (
          <ApplicationsTable rows={rows} />
        )}
      </section>
    </div>
  );
}
