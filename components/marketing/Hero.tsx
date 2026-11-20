import Link from "next/link";
import { ArrowRight, KeyRound, FileEdit, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { MatchReportDemo } from "./MatchReportDemo";
import { Container } from "./Section";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pb-24 pt-16 sm:pt-20 lg:pb-32 lg:pt-24">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-14 gap-y-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <h1
            id="hero-title"
            className="font-display text-[clamp(2.5rem,4.6vw,3.75rem)] font-normal leading-[1.02] tracking-[-0.02em] text-balance text-ink"
          >
            Edit your resume on a true PDF canvas.
            <br />
            <em className="text-brass not-italic">Tailor to any job post with AI.</em>
          </h1>

          <p className="mt-6 max-w-[34rem] text-lead text-pretty text-ink-2 leading-relaxed">
            Direct, interactive inline editing modeled after Sejda PDF Editor — complete with ribbon formatting, section inserters, and real-time ATS match scoring. Find missing skills, verify applicant tracking system searchability, and export pixel-perfect PDF & Word resumes. Completely private, self-hosted, and free.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Start Building Free <ArrowRight aria-hidden />
            </Link>
            <Link href="/scan" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Scan a Resume
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5 text-small text-ink-3">
            <span className="flex items-center gap-1.5">
              <FileEdit className="size-4 text-brass" />
              <span>Sejda-Style Direct PDF Canvas</span>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>100% ATS Parser Safe</span>
            </span>
            <span className="flex items-center gap-1.5">
              <KeyRound className="size-4 text-brass" />
              <span>Free & Self-Hosted · BYO Gemini Key</span>
            </span>
          </div>
        </div>

        <MatchReportDemo />
      </Container>
    </section>
  );
}
