import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { GeminiKeyCard } from "@/components/settings/GeminiKeyCard";
import { AccountSection } from "@/components/settings/AccountSection";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_key_status, gemini_key_last4")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-page font-semibold tracking-[-0.015em]">Settings</h1>
      <div className="mt-8 mb-8 max-w-2xl">
        <GeminiKeyCard initialStatus={profile?.gemini_key_status ?? "not_configured"} initialLast4={profile?.gemini_key_last4 ?? null} />
      </div>
      <AccountSection email={user.email ?? ""} />
    </div>
  );
}
