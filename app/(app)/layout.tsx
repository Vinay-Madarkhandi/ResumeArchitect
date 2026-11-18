import { RefreshSession } from "@/components/auth/RefreshSession";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireOnboardedUser();

  return (
    <div className="min-h-dvh">
      <RefreshSession />
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}
