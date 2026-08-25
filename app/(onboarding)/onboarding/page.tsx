import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";

export default function OnboardingWelcomePage() {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-xl text-center">
      <Icon name="new-tailoring" size={32} className="mx-auto mb-md text-secondary" />
      <h1 className="mb-sm font-display text-headline-lg text-primary">Welcome to ResumeArchitect</h1>
      <p className="mx-auto max-w-[28rem] font-sans text-body-lg text-on-surface-variant">
        You already have the experience. Let&rsquo;s build a resume you can adapt for every
        opportunity — set up your profile once, then tailor it for as many jobs as you want.
      </p>
      <Link href="/onboarding/profile" className="mt-lg inline-block">
        <Button variant="primary" size="lg">
          Get started
        </Button>
      </Link>
    </div>
  );
}
