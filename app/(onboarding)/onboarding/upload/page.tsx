import { Suspense } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { UploadForm } from "./UploadForm";

export default async function OnboardingUploadPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).single()
    : { data: null };
  const isReplacement = Boolean(profile?.onboarding_completed_at);

  return (
    <div>
      <h1 className="mb-1 font-sans text-headline-lg text-primary">
        {isReplacement ? "Replace your master resume" : "Add your resume"}
      </h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        {isReplacement
          ? "Your current master resume stays available in the library, archived, so past tailored resumes keep their history."
          : "We'll use this as your starting resume. You can edit it later."}
      </p>
      <Suspense fallback={null}>
        <UploadForm />
      </Suspense>
    </div>
  );
}
