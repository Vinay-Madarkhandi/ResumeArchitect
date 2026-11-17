import type { Metadata } from "next";
import { ClosingCta, SiteFooter } from "@/components/marketing/Closing";
import { Comparison } from "@/components/marketing/Comparison";
import { Faq } from "@/components/marketing/Faq";
import { Features } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Privacy } from "@/components/marketing/Privacy";
import { Problem } from "@/components/marketing/Problem";
import { RedlineCloseUp } from "@/components/marketing/RedlineCloseUp";
import { ScoreExplained } from "@/components/marketing/ScoreExplained";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: { absolute: "ResumeArchitect · See every change before it's yours" },
  description:
    "Tailor your resume to one job with your own Gemini key. Every change is a redline with a reason, every score is explained, and nothing is kept until you keep it.",
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brass focus:px-3 focus:py-2 focus:text-small focus:text-on-brass"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <RedlineCloseUp />
        <ScoreExplained />
        <Features />
        <Privacy />
        <Comparison />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
