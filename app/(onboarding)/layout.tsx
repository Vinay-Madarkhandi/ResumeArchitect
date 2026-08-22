import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-margin-mobile py-xxl md:px-margin-desktop">
      <OnboardingProgress />
      <div className="mx-auto w-full max-w-[36rem]">{children}</div>
    </div>
  );
}
