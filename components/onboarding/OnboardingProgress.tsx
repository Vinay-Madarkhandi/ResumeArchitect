"use client";

import { usePathname } from "next/navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";

const STEPS = [
  "/onboarding",
  "/onboarding/profile",
  "/onboarding/upload",
  "/onboarding/review",
  "/onboarding/connect-gemini",
];

export function OnboardingProgress() {
  const pathname = usePathname();
  const index = Math.max(STEPS.indexOf(pathname), 0);
  const value = ((index + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto mb-xl w-full max-w-[36rem]">
      <ProgressBar value={value} />
    </div>
  );
}
