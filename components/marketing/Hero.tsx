import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck, Cpu } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { MatchReportDemo } from "./MatchReportDemo";
import { Container } from "./Section";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pb-20 pt-14 sm:pt-16 lg:pb-28 lg:pt-20">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-14 gap-y-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-sunken/80 px-3 py-1 font-mono text-label text-ink-2">
            <span className="size-1.5 rounded-full bg-brass" />
            <span>Single-stream document architecture · Deterministic ATS rubric</span>
          </div>

          <h1
            id="hero-title"
            className="font-display text-[clamp(2.4rem,4.5vw,3.75rem)] font-normal leading-[1.04] tracking-[-0.025em] text-balance text-ink"
          >
            Resumes engineered for the parser.
            <br />
            <span className="font-serif italic text-brass">Typeset for the recruiter.</span>
          </h1>

          <p className="mt-5 max-w-[34rem] text-lead text-pretty text-ink-2 leading-relaxed">
            Applicant tracking systems strip tables, text frames, and sidebars before human eyes ever review your file. ResumeArchitect delivers direct inline canvas editing on an authentic A4 proof sheet, paired with deterministic ATS token analysis and line-by-line provenance.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Create a resume <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link href="/scan" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Scan a document
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-line/60 pt-6 text-small text-ink-3">
            <span className="flex items-center gap-2">
              <FileText className="size-4 text-brass" />
              <span>Direct PDF canvas</span>
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>100% parser-safe hierarchy</span>
            </span>
            <span className="flex items-center gap-2">
              <Cpu className="size-4 text-brass" />
              <span>Zero outbound telemetry</span>
            </span>
          </div>
        </div>

        <MatchReportDemo />
      </Container>
    </section>
  );
}
