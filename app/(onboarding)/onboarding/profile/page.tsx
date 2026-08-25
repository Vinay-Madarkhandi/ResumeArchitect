import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function OnboardingProfilePage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, headline, phone, location, links")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="mb-1 font-display text-headline-lg text-primary">Set up your profile</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        Your basic professional identity. You can change this anytime in Settings.
      </p>
      <ProfileForm
        email={user.email ?? ""}
        initialFullName={profile?.full_name ?? ""}
        initialHeadline={profile?.headline ?? ""}
        initialPhone={profile?.phone ?? ""}
        initialLocation={profile?.location ?? ""}
        initialLinks={profile?.links ?? []}
      />
    </div>
  );
}
