import { PersonalTokens } from "@/components/settings/PersonalTokens";
import { listPersonalTokens } from "@/lib/auth/personal-tokens";
import { getProfileStatus } from "@/lib/data/profiles";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import type { Metadata } from "next";
import { GeminiKeyCard } from "@/components/settings/GeminiKeyCard";
import { TrackerReminders } from "@/components/settings/TrackerReminders";
import { AccountSection } from "@/components/settings/AccountSection";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireOnboardedUser();

  const [profile, tokens] = await Promise.all([getProfileStatus(user.id), listPersonalTokens(user.id)]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-page font-semibold tracking-[-0.015em]">Settings</h1>
      <div className="mt-8 mb-8 max-w-2xl">
        <GeminiKeyCard initialStatus={profile?.gemini_key_status ?? "not_configured"} initialLast4={profile?.gemini_key_last4 ?? null} />
      </div>
      <div className="mb-8 space-y-5">
        <PersonalTokens tokens={tokens} />
        <TrackerReminders enabled={Boolean(profile?.tracker_reminders)} />
      </div>
      <AccountSection email={user.email} twoFactor={Boolean(user.twoFactor)} />
    </div>
  );
}
