import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { ScanForm } from "@/components/scan/ScanForm";
import { buttonVariants } from "@/components/ui/Button";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { getJobDescription, listScanTargets } from "@/lib/data/job-descriptions";
import { getProfileStatus } from "@/lib/data/profiles";
import { listResumes } from "@/lib/data/resumes";
import { TARGET_MATCH_RATE } from "@/lib/report/matchReport";

export const metadata: Metadata = { title: "Resume scanner" };

export default async function ScanPage({ searchParams }: PageProps<"/scan">) {
  const { job, resume } = await searchParams;
  const user = await requireOnboardedUser();
  const [resumes, targets, profile, requestedJob] = await Promise.all([
    listResumes(user.id), listScanTargets(user.id), getProfileStatus(user.id),
    typeof job === "string" ? getJobDescription(user.id, job) : null,
  ]);
  if (requestedJob && !targets.some((target) => target.id === requestedJob.id)) {
    targets.unshift({
      id: requestedJob.id, title: requestedJob.job_title || "Untitled job",
      company: requestedJob.company, hasFacts: requestedJob.job_facts !== null,
    });
  }

  // The default master first, then the most recently edited.
  const resumeOptions = resumes
    .filter((r) => r.status !== "archived" && (r.kind === "tailored" || r.is_default))
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((r) => ({ id: r.id, label: r.kind === "master" ? `${r.title} (master)` : r.title }));
  const jobOptions = targets.map((t) => ({ id: t.id, label: t.company ? `${t.title} · ${t.company}` : t.title, hasFacts: t.hasFacts }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-page font-semibold tracking-[-0.015em]">Resume scanner</h1>
            <span className="inline-flex items-center rounded-full border border-brass/30 bg-brass/10 px-2.5 py-0.5 text-label font-medium text-brass">
              Target: {TARGET_MATCH_RATE}%+ Match
            </span>
          </div>
          <p className="mt-1.5 max-w-[36rem] text-body text-ink-2">
            Simulate how top applicant tracking systems parse your resume against a target role. Check keyword density, layout compliance, and formatting before applying.
          </p>
        </div>
        <Link href="/scans" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <History aria-hidden /> Scan history
        </Link>
      </div>
      <ScanForm
        resumes={resumeOptions}
        jobs={jobOptions}
        hasKey={profile?.gemini_key_status === "valid"}
        initialJobId={typeof job === "string" ? job : null}
        initialResumeId={typeof resume === "string" ? resume : null}
      />
    </div>
  );
}
