import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { GeminiKeyManager } from "@/components/settings/GeminiKeyManager";
import { ProfilePreferencesSchema } from "@/lib/schemas/profile";
import { SettingsProfileForm } from "./SettingsProfileForm";
import { PreferencesForm } from "./PreferencesForm";
import { DataTab } from "./DataTab";
import { AccountTab } from "./AccountTab";

export default async function SettingsPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: profile }, { data: resumes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, headline, phone, location, links, gemini_key_status, gemini_key_last4, preferences")
      .eq("id", user.id)
      .single(),
    supabase.from("resumes").select("kind").eq("user_id", user.id).eq("status", "draft"),
  ]);

  const preferences = ProfilePreferencesSchema.safeParse(profile?.preferences ?? {});
  const resumeCount = resumes?.length ?? 0;
  const tailoredCount = resumes?.filter((r) => r.kind === "tailored").length ?? 0;

  return (
    <div className="mx-auto max-w-max-width-doc px-margin-mobile py-lg md:px-0 md:py-xl">
      <h1 className="mb-1 font-sans text-headline-lg text-primary">Settings</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        Manage your profile, your Gemini key, and your data.
      </p>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
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

        <TabsContent value="preferences">
          <PreferencesForm initial={preferences.success ? preferences.data : ProfilePreferencesSchema.parse({})} />
        </TabsContent>

        <TabsContent value="data">
          <DataTab resumeCount={resumeCount} tailoredCount={tailoredCount} />
        </TabsContent>

        <TabsContent value="account">
          <AccountTab email={user.email ?? ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
