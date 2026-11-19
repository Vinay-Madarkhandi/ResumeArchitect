import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { MatchReportDemo } from "./MatchReportDemo";
import { Container } from "./Section";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pb-24 pt-14 sm:pt-20 lg:pb-32 lg:pt-24">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-14 gap-y-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <h1
            id="hero-title"
            className="font-display text-[clamp(2.5rem,4.6vw,3.75rem)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-ink"
          >
            Scan your resume,
            <br />
            <em className="text-brass">free, on your own key.</em>
          </h1>
          <p className="mt-7 max-w-[34rem] text-lead text-pretty text-ink-2">
            Paste a job post and get a match report: the skills you&rsquo;re missing, whether an applicant tracking
            system can read your file, and what to fix first. Then tailor the resume, track the application and prepare
            for the interview from the same self-hosted workbench. There are no pricing tiers and no monthly scan cap.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Scan a resume <ArrowRight aria-hidden />
            </Link>
            <a href="#report" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              See what the report covers
            </a>
          </div>
          <p className="mt-5 flex items-center gap-2 text-small text-ink-3">
            <KeyRound className="size-4 shrink-0 text-brass" aria-hidden />
            Free · self-hosted · bring your own Gemini key
          </p>
        </div>
        <MatchReportDemo />
      </Container>
    </section>
  );
}
