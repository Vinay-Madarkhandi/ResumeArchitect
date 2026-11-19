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
          ResumeArchitect is free to use. Its AI steps run on your own Google key, so you control the cost and where your
          text goes. Connect it now to scan a job as soon as your resume is in, or start with your resume and connect the
          key later.
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
          Reading each job post once, rebuilding uploaded resumes, rewriting lines, and the career tools. Nothing runs
          unless you start it. Match reports are computed in code, so you can rescan a job you&rsquo;ve already read
          without a key.
        </p>
        <h2 className="mt-6 text-body font-semibold text-ink">What happens next</h2>
        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 marker:text-ink-3">
          <li>Add your resume: import a file or build one.</li>
          <li>Scan it against a job and read the match report.</li>
        </ol>
      </aside>
    </div>
  );
}
