import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { RefreshSession } from "@/components/auth/RefreshSession";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Steps } from "@/components/onboarding/Steps";
import { requireUser } from "@/lib/auth/current-user";
import { getProfileStatus } from "@/lib/data/profiles";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const finished = Boolean((await getProfileStatus(user.id))?.onboarding_completed_at);

  return (
    <div className="min-h-dvh">
      <RefreshSession />
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo href="/dashboard" />
          {finished ? (
            <Link href="/resumes" className="mx-auto inline-flex items-center gap-1.5 rounded-md text-small text-ink-3 hover:text-ink">
              <ArrowLeft className="size-3.5" aria-hidden /> Back to resumes
            </Link>
          ) : (
            <div className="mx-auto">
              <Steps />
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>
      <AnnouncementBanner />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">{children}</main>
    </div>
  );
}
