import Link from "next/link";
import { ArrowRight, KeyRound, Sparkles, FileEdit, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { MatchReportDemo } from "./MatchReportDemo";
import { Container } from "./Section";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pb-24 pt-14 sm:pt-20 lg:pb-32 lg:pt-24">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-14 gap-y-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          {/* Glowing badge pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3.5 py-1 text-label font-medium text-brass shadow-xs">
            <Sparkles className="size-3.5 animate-pulse" />
            <span>AI ATS Resume Scanner & Sejda-Style PDF Editor</span>
          </div>

          <h1
            id="hero-title"
            className="font-display text-[clamp(2.5rem,4.6vw,3.75rem)] font-normal leading-[1.02] tracking-[-0.02em] text-balance text-ink"
          >
            Edit your resume on a true PDF canvas.
            <br />
            <em className="text-brass not-italic">Tailor to any job post with AI.</em>
          </h1>

          <p className="mt-6 max-w-[34rem] text-lead text-pretty text-ink-2 leading-relaxed">
            Experience direct, interactive inline editing modeled after Sejda PDF Editor — complete with ribbon formatting, section inserters, and live ATS matching. Scan against any job post to find missing keywords, verify searchability, and export pixel-perfect PDF & Word resumes. Completely free, private, and self-hosted.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Start Building Free <ArrowRight aria-hidden />
            </Link>
            <Link href="/scan" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Scan a Resume
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-small text-ink-3">
            <span className="flex items-center gap-1.5">
              <FileEdit className="size-4 text-brass" />
              <span>Sejda-Style Direct PDF Canvas</span>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>100% ATS Verified</span>
            </span>
            <span className="flex items-center gap-1.5">
              <KeyRound className="size-4 text-brass" />
              <span>BYO Gemini Key · Free Forever</span>
            </span>
          </div>
        </div>

        <MatchReportDemo />
      </Container>
    </section>
  );
}
