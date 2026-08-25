import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ConnectGeminiClient } from "./ConnectGeminiClient";

export default async function OnboardingConnectGeminiPage() {
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
    <div>
      <h1 className="mb-1 font-display text-headline-lg text-primary">Connect Gemini</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        This is what powers tailoring — you bring your own key, and it&rsquo;s a one-time setup. You can also do
        this later from Settings.
      </p>
      <ConnectGeminiClient
        initialStatus={profile?.gemini_key_status ?? "not_configured"}
        initialLast4={profile?.gemini_key_last4 ?? null}
      />
    </div>
  );
}
