import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, KeyRound, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "ResumeArchitect · Tailor your resume to every job, line by line",
};

const STAGES = [
  { name: "Read the job", body: "Gemini pulls out the must-haves, nice-to-haves, and the words recruiters search for." },
  { name: "Measure", body: "Your resume is scored against those requirements before anything changes." },
  { name: "Rewrite", body: "Lines you already have are reworded toward the role. Nothing new is invented." },
  { name: "Proof", body: "Every edit is checked against your original. New numbers, names, or skills get flagged." },
  { name: "Score", body: "The result is measured with the same yardstick, so the change is a fair comparison." },
];

/** Example data for the illustration, labeled on the page as an example. */
function ProofIllustration() {
  return (
    <figure className="relative" aria-label="Example of a reviewed change">
      <div className="paper rotate-[-0.6deg] px-7 py-8 text-[13px] sm:px-11 sm:pb-36" data-template="classic">
        <div className="paper-flow">
          <h2 style={{ marginTop: 0 }}>Experience</h2>
          <h3>Senior Engineer — Harbor Freight Labs</h3>
          <p style={{ color: "var(--paper-muted)" }}>2021 – Present · Lisbon</p>
          <div className="rl-bullet">
            <del className="mark-del">Worked on</del>
            <ins className="mark-add">Led</ins> migration of the billing service to{" "}
            <ins className="mark-add">event-driven</ins> Kafka pipelines, cutting invoice latency 38%
          </div>
          <div className="rl-bullet" style={{ opacity: 0.55 }}>
            Mentored four engineers through on-call rotations
          </div>
          <div className="rl-bullet">
            <ins className="mark-add">Owned incident response for payments, with a 99.95% uptime SLO</ins>
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-6 w-[min(17.5rem,92%)] rounded-lg border border-line bg-raised p-4 shadow-pop sm:absolute sm:-right-6 sm:bottom-2 sm:mt-0">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-label text-ink-3">Original</p>
            <p className="font-mono text-[22px] leading-none text-ink-3 line-through decoration-del/70 decoration-1 tabular">52</p>
          </div>
          <div className="mb-1.5 h-px flex-1 bg-line-strong" />
          <div className="text-right">
            <p className="text-label text-ink-3">Now</p>
            <p className="font-mono text-[34px] font-medium leading-none text-ink tabular">81</p>
          </div>
        </div>
        <p className="mt-3 border-t border-line pt-3 text-small text-ink-2">
          The posting asks for incident response. Your on-call bullet already shows it, and now it says so.
        </p>
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-query-soft px-2 py-1.5 text-label text-ink">
          <CircleHelp className="mt-px size-3.5 shrink-0 text-query" aria-hidden />
          &ldquo;99.95%&rdquo; isn&rsquo;t in your original. Confirm it before keeping.
        </p>
      </div>
      <figcaption className="mt-4 text-label text-ink-3 sm:mt-6">Example resume and job, for illustration.</figcaption>
    </figure>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-5 sm:px-8">
        <Logo />
        <nav className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Get started
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-16 px-5 pb-28 pt-12 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
          <div>
            <h1 className="font-display text-[clamp(2.75rem,6vw,4.75rem)] font-normal leading-[0.98] tracking-[-0.02em] text-ink">
              Every line,
              <br />
              <em className="text-brass">set for the job.</em>
            </h1>
            <p className="mt-7 max-w-[34rem] text-lead text-ink-2">
              Paste a job post. ResumeArchitect rewrites your real experience toward it, shows every change with its
              reason and a before&nbsp;→&nbsp;after match score, and flags anything it can&rsquo;t back up. You keep
              what&rsquo;s true, revert the rest, and download a PDF or Word file.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Tailor your resume <ArrowRight aria-hidden />
              </Link>
              <span className="flex items-center gap-2 text-small text-ink-3">
                <KeyRound className="size-4 text-brass" aria-hidden /> Runs on your own free Gemini key
              </span>
            </div>
          </div>
          <ProofIllustration />
        </section>

        <section className="border-y border-line bg-panel/60">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-2xl font-display text-[clamp(2rem,3.6vw,2.75rem)] leading-[1.05] tracking-[-0.015em]">
              Five steps you can watch, not a black box.
            </h2>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
              {STAGES.map((s, i) => (
                <li key={s.name} className="flex flex-col gap-3 bg-ground p-5">
                  <span className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full border border-brass font-mono text-[11px] text-brass tabular">
                      {i + 1}
                    </span>
                    <span className="h-px flex-1 bg-line-strong" aria-hidden />
                  </span>
                  <h3 className="text-lead font-semibold text-ink">{s.name}</h3>
                  <p className="text-small text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-x-16 gap-y-12 px-5 py-24 sm:px-8 md:grid-cols-3">
          <div>
            <h3 className="text-lead font-semibold text-ink">See exactly what changed</h3>
            <p className="mt-2 text-body text-ink-2">
              A word-level redline of every line, with the reason it was changed and the requirement it serves.
            </p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-lead font-semibold text-ink">
              Revert any change <RotateCcw className="size-4 text-ink-3" aria-hidden />
            </h3>
            <p className="mt-2 text-body text-ink-2">
              Keep or revert changes one at a time, or edit the page directly. Select any text to have AI rewrite just
              that part.
            </p>
          </div>
          <div>
            <h3 className="text-lead font-semibold text-ink">A score that explains itself</h3>
            <p className="mt-2 text-body text-ink-2">
              Must-haves, nice-to-haves, keywords, and ATS checks, each with its points and the line that earned them.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-28 sm:px-8">
          <div className="flex flex-col items-start gap-6 rounded-lg border border-line bg-panel px-8 py-12 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-[2rem] leading-tight tracking-[-0.01em]">Your next application, set properly.</h2>
              <p className="mt-2 text-body text-ink-2">Free to use with your own Gemini key. Your master resume is never changed.</p>
            </div>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "shrink-0")}>
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-small text-ink-3 sm:px-8">
          <span>© {new Date().getFullYear()} ResumeArchitect</span>
          <span>Your key is encrypted at rest and never shown again.</span>
        </div>
      </footer>
    </div>
  );
}
