import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ResumeContentSchema } from "@/lib/schemas/resume";
import { ReviewForm } from "./ReviewForm";

export default async function OnboardingReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ resumeId?: string }>;
}) {
  const { resumeId } = await searchParams;
  if (!resumeId) redirect("/onboarding/upload");

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: resume }, { data: profile }] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, user_id, kind, content, low_confidence_fields")
      .eq("id", resumeId)
      .single(),
    supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).single(),
  ]);

  if (!resume || resume.user_id !== user.id || resume.kind !== "master") {
    redirect("/onboarding/upload");
  }

  const parsedContent = ResumeContentSchema.safeParse(resume.content);
  if (!parsedContent.success) redirect("/onboarding/upload");

  const isReplacement = Boolean(profile?.onboarding_completed_at);

  return (
    <div>
      <h1 className="mb-1 font-sans text-headline-lg text-primary">Review your resume</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        This is what we found. Fix anything that&rsquo;s wrong — this becomes your master resume.
      </p>
      <ReviewForm
        resumeId={resume.id}
        initialContent={parsedContent.data}
        lowConfidenceFields={resume.low_confidence_fields}
        isReplacement={isReplacement}
      />
    </div>
  );
}
