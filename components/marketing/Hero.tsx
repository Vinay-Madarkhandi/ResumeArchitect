import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { HeroDemo } from "./HeroDemo";
import { Container } from "./Section";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pb-24 pt-14 sm:pt-20 lg:pb-32 lg:pt-24">
      <Container className="grid items-center gap-x-14 gap-y-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <h1
            id="hero-title"
            className="font-display text-[clamp(2.75rem,5.2vw,4.375rem)] font-normal leading-[0.98] tracking-[-0.02em] text-balance text-ink"
          >
            See every change
            <br />
            <em className="text-brass">before it&rsquo;s yours.</em>
          </h1>
          <p className="mt-7 max-w-[34rem] text-lead text-pretty text-ink-2">
            Paste a job post. ResumeArchitect rewrites your real experience toward it and hands back a redline: every
            changed word, the reason for it, the requirement it serves, and how your match score moved. Keep what&rsquo;s
            true, revert the rest, download what you see.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Tailor your resume <ArrowRight aria-hidden />
            </Link>
            <a href="#redline" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              See a sample redline
            </a>
          </div>
          <p className="mt-5 flex items-center gap-2 text-small text-ink-3">
            <KeyRound className="size-4 text-brass" aria-hidden />
            Free · bring your own Gemini key
          </p>
        </div>
        <HeroDemo />
      </Container>
    </section>
  );
}
