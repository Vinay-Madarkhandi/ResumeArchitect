import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { getProfileStatus } from "@/lib/data/profiles";
import { requireUser } from "@/lib/auth/current-user";
import type { Metadata } from "next";
import { ImportResume } from "@/components/onboarding/ImportResume";

export const metadata: Metadata = { title: "Add your resume" };

export default async function ResumeStepPage() {
  const user = await requireUser();
  const profile = await getProfileStatus(user.id);
  const replacing = !!profile?.onboarding_completed_at;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-page font-semibold tracking-[-0.015em]">
        {replacing ? "Replace your master resume" : "Add your current resume"}
      </h1>
      <p className="mt-3 text-lead text-ink-2">
        This becomes your master copy. Every application starts from it, and it is never changed by tailoring.
      </p>
      <div className="mt-5">
        <Link href="/onboarding/build" className={buttonVariants()}>Build a resume from scratch</Link>
      </div>
      <div className="mt-8">
        <ImportResume hasKey={profile?.gemini_key_status === "valid"} next="/onboarding/review" />
      </div>
    </div>
  );
}
