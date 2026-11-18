import { getProfileStatus } from "@/lib/data/profiles";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import type { Metadata } from "next";
import { ConnectStep } from "@/components/onboarding/ConnectStep";

export const metadata: Metadata = { title: "Connect Gemini" };

export default async function ConnectPage() {
  const user = await requireUser();
  const profile = await getProfileStatus(user.id);
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  return (
    <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_22rem]">
      <div>
        <h1 className="text-page font-semibold tracking-[-0.015em]">Bring your own Gemini key</h1>
        <p className="mt-3 max-w-prose text-lead text-ink-2">
          ResumeArchitect runs every AI step on your key, so you control the cost and the data. Gemini&rsquo;s free tier
          covers dozens of tailored resumes a day.
        </p>
        <div className="mt-8">
          <ConnectStep status={profile?.gemini_key_status ?? "not_configured"} last4={profile?.gemini_key_last4 ?? null} />
        </div>
      </div>
      <aside className="text-small text-ink-2 md:border-l md:border-line md:pl-8 md:pt-2">
        <h2 className="text-body font-semibold text-ink">Get a key in a minute</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-4 marker:text-ink-3">
          <li>Open Google AI Studio and sign in with a Google account.</li>
          <li>Choose &ldquo;Create API key&rdquo;.</li>
          <li>Copy the key (it starts with &ldquo;AIza&rdquo;) and paste it here.</li>
        </ol>
        <h2 className="mt-6 text-body font-semibold text-ink">What it&rsquo;s used for</h2>
        <p className="mt-2">
          Reading job posts, rebuilding uploaded resumes, rewriting lines, and Ask&nbsp;AI edits. Nothing runs unless you
          start it.
        </p>
      </aside>
    </div>
  );
}
