import Link from "next/link";
import { ArrowRight, Check, History, ScanSearch } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { TARGET_MATCH_RATE } from "@/lib/report/matchReport";
import { cn } from "@/lib/cn";

export interface SetupState {
  keyConnected: boolean;
  hasResume: boolean;
  hasScan: boolean;
}

type Step = { id: string; title: string; body: ReactNode; done: boolean; action: ReactNode };

function steps({ keyConnected, hasResume, hasScan }: SetupState): Step[] {
  return [
    {
      id: "key",
      title: keyConnected ? "Gemini key connected" : "Connect your Gemini key",
      done: keyConnected,
      body: keyConnected
        ? "Job posts are read once with your key, then every rescan is instant."
        : "Gemini reads each job post once to pull out its skills. The key is encrypted on this server and never shown again. A free key from Google AI Studio works.",
      action: keyConnected ? null : (
        <>
          <Link href="/settings" className={buttonVariants({ size: "sm" })}>Connect a key</Link>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-small text-ink-3 underline decoration-line-strong hover:text-ink">
            Get a key
          </a>
        </>
      ),
    },
    {
      id: "resume",
      title: hasResume ? "Resume added" : "Add a resume",
      done: hasResume,
      body: hasResume ? "Your master resume is what scans start from." : "Import a PDF or Word file, or build one step by step.",
      action: hasResume ? null : (
        <>
          <Link href="/onboarding/resume" className={buttonVariants({ size: "sm" })}>Import a file</Link>
          <Link href="/onboarding/build" className={buttonVariants({ variant: "ghost", size: "sm" })}>Build one</Link>
        </>
      ),
    },
    {
      id: "scan",
      title: hasScan ? "First scan done" : "Run your first scan",
      done: hasScan,
      body: hasScan
        ? "Every scan is saved in your history."
        : `Paste a job post, scan, and read the match report. Aim for ${TARGET_MATCH_RATE}% before you apply.`,
      action: hasScan ? null : <Link href="/scan" className={buttonVariants({ variant: "primary", size: "sm" })}>Scan a resume <ArrowRight aria-hidden /></Link>,
    },
  ];
}

/** The first thing on the dashboard: scan a resume against a job, with the setup it still needs. */
export function ScanLead({ setup }: { setup: SetupState }) {
  const list = steps(setup);
  const complete = list.every((s) => s.done);
  const current = list.findIndex((s) => !s.done);

  return (
    <section aria-labelledby="scan-lead" className="overflow-hidden rounded-lg border border-line bg-panel">
      <span aria-hidden className="block h-0.5 bg-brass" />
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h1 id="scan-lead" className="text-page font-semibold tracking-[-0.015em]">Scan a resume against a job</h1>
          <p className="mt-2 text-body text-ink-2">
            Get a match rate, the keywords the job wants that your resume is missing, and what an applicant tracking
            system can&rsquo;t read. Fix what it finds, then scan again. There is no monthly scan cap.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/scan" className={buttonVariants({ variant: "primary", size: "lg" })}>
            <ScanSearch aria-hidden /> Start a scan
          </Link>
          <Link href="/scans" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            <History aria-hidden /> History
          </Link>
        </div>
      </div>

      {!complete && (
        <div className="border-t border-line bg-sunken/50 px-5 py-4 sm:px-6">
          <h2 className="text-body font-semibold text-ink">Get ready to scan</h2>
          <ol className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-3">
            {list.map((step, i) => (
              <li key={step.id} className="flex min-w-0 gap-3" aria-current={i === current ? "step" : undefined}>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] tabular",
                    step.done ? "border-brass bg-brass text-on-brass" : i === current ? "border-brass text-brass" : "border-line-strong text-ink-3",
                  )}
                >
                  {step.done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-body font-medium", step.done ? "text-ink-3" : "text-ink")}>{step.title}</p>
                  <p className="mt-0.5 text-small text-ink-2">{step.body}</p>
                  {step.action && <div className="mt-2.5 flex flex-wrap items-center gap-2">{step.action}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
