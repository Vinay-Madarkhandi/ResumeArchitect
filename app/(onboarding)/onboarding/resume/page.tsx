import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ImportResume } from "@/components/onboarding/ImportResume";

export const metadata: Metadata = { title: "Add your resume" };

export default async function ResumeStepPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_key_status, onboarding_completed_at")
    .eq("id", user.id)
    .single();
  const replacing = !!profile?.onboarding_completed_at;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-page font-semibold tracking-[-0.015em]">
        {replacing ? "Replace your master resume" : "Add your current resume"}
      </h1>
      <p className="mt-3 text-lead text-ink-2">
        This becomes your master copy. Every application starts from it, and it is never changed by tailoring.
      </p>
      <div className="mt-8">
        <ImportResume hasKey={profile?.gemini_key_status === "valid"} next="/onboarding/review" />
      </div>
    </div>
  );
}
