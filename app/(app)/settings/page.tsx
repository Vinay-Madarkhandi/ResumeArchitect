import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { GeminiKeyManager } from "@/components/settings/GeminiKeyManager";
import { SettingsProfileForm } from "./SettingsProfileForm";

export default async function SettingsPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, headline, phone, location, links, gemini_key_status, gemini_key_last4")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-max-width-doc px-margin-mobile py-lg md:px-0 md:py-xl">
      <h1 className="mb-lg font-sans text-headline-lg text-primary">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <SettingsProfileForm
            email={user.email ?? ""}
            initialFullName={profile?.full_name ?? ""}
            initialHeadline={profile?.headline ?? ""}
            initialPhone={profile?.phone ?? ""}
            initialLocation={profile?.location ?? ""}
            initialLinks={profile?.links ?? []}
          />
        </TabsContent>

        <TabsContent value="gemini">
          <GeminiKeyManager
            initialStatus={profile?.gemini_key_status ?? "not_configured"}
            initialLast4={profile?.gemini_key_last4 ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
