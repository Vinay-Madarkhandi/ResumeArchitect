import type { Metadata } from "next";
import { ClosingCta, SiteFooter } from "@/components/marketing/Closing";
import { Faq } from "@/components/marketing/Faq";
import { FeatureRows, FeaturesIntro } from "@/components/marketing/FeatureRows";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { RedlineCloseUp } from "@/components/marketing/RedlineCloseUp";
import { ReportAnatomy } from "@/components/marketing/ReportAnatomy";
import { SelfHosted } from "@/components/marketing/SelfHosted";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: { absolute: "ResumeArchitect · A free resume scanner on your own Gemini key" },
  description:
    "Scan your resume against any job and read a match report. Free, self-hosted and bring-your-own-key, with tailoring, a job tracker, a browser clipper, LinkedIn review, interview prep and a cover letter scanner.",
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
        <HowItWorks />
        <ReportAnatomy />
        <FeaturesIntro />
        <FeatureRows keys={["ats", "powerEdit"]} />
        <RedlineCloseUp />
        <FeatureRows keys={["builder", "tracker", "clipper", "linkedin", "interview", "coverLetter"]} last />
        <SelfHosted />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
