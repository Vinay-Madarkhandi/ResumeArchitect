import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, CircleAlert, FileText, Plus, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreDelta } from "@/components/dashboard/ScoreDelta";
import { ResumeActions } from "@/components/dashboard/ResumeActions";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { TailoredChange } from "@/lib/schemas/tailoring";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Applications" };

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export default async function DashboardPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: resumes }, { data: profile }] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, kind, title, status, is_default, updated_at, job_title_snapshot, job_company_snapshot, tailoring_session_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("gemini_key_status").eq("id", user.id).single(),
  ]);

  const master = resumes?.find((r) => r.kind === "master" && r.is_default) ?? null;
  const applications = (resumes ?? []).filter((r) => r.kind === "tailored");
  const sessionIds = applications.map((a) => a.tailoring_session_id).filter((x): x is string => !!x);
  const { data: sessions } = sessionIds.length
    ? await supabase.from("tailoring_sessions").select("id, score_before, score_after, changes").in("id", sessionIds)
    : { data: [] };
  const byId = new Map((sessions ?? []).map((s) => [s.id, s]));

  const { data: failed } = await supabase
    .from("tailoring_sessions")
    .select("id, error_message, created_at, job_analysis")
    .eq("user_id", user.id)
    .eq("status", "failed")
    .gte("created_at", hoursAgo(24))
    .order("created_at", { ascending: false })
    .limit(1);

  const keyMissing = profile?.gemini_key_status !== "valid";

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page font-semibold tracking-[-0.015em]">Applications</h1>
          <p className="mt-1.5 text-body text-ink-2">One tailored resume per job, each measured against its posting.</p>
        </div>
      </div>

      {keyMissing && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brass/40 bg-brass-soft px-4 py-3 text-body">
          <CircleAlert className="size-4 text-brass" aria-hidden />
          <p className="flex-1 text-ink">Connect a Gemini key to tailor resumes and use Ask AI.</p>
          <Link href="/settings" className={buttonVariants({ size: "sm" })}>
            Open settings
          </Link>
        </div>
      )}

      {failed?.[0] && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 text-body">
          <CircleAlert className="size-4 text-danger" aria-hidden />
          <p className="flex-1 text-ink-2">
            Your last run didn&rsquo;t finish{failed[0].error_message ? `: ${failed[0].error_message}` : "."}
          </p>
          <Link href={`/new?retry=${failed[0].id}`} className={buttonVariants({ size: "sm" })}>
            <RefreshCw aria-hidden /> Retry
          </Link>
        </div>
      )}

      <section aria-labelledby="master-heading">
        <h2 id="master-heading" className="mb-3 text-small font-medium text-ink-3">
          Master resume
        </h2>
        {master ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-panel px-4 py-3.5">
            <FileText className="hidden size-5 text-ink-3 sm:block" aria-hidden />
            <div className="min-w-0 flex-1 basis-56">
              <Link href={`/resumes/${master.id}`} className="block truncate text-lead font-medium text-ink hover:underline">
                {master.title}
              </Link>
              <p className="text-small text-ink-3">
                Edited {formatRelativeTime(master.updated_at)}
                <span className="hidden sm:inline"> · the starting point for every application</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/onboarding/resume" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Replace
              </Link>
              <Link href={`/resumes/${master.id}`} className={buttonVariants({ size: "sm" })}>
                Edit
              </Link>
              <ResumeActions id={master.id} title={master.title} deletable={false} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-line-strong px-4 py-4">
            <p className="text-body text-ink-2">Add the resume you&rsquo;ll tailor from.</p>
            <Link href="/onboarding/resume" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Add resume
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="apps-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="apps-heading" className="text-small font-medium text-ink-3">
            Tailored for a job <span className="font-mono tabular">· {applications.length}</span>
          </h2>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center">
            <p className="text-title font-semibold text-ink">Tailor your first application</p>
            <p className="mx-auto mt-2 max-w-md text-body text-ink-2">
              Paste a job post. Gemini reads it, rewrites your resume&rsquo;s lines to fit, checks nothing was invented,
              and shows you every change with its reason.
            </p>
            <Link href="/new" className={cn(buttonVariants({ variant: "primary" }), "mt-6")}>
              <Plus aria-hidden /> New application
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line">
            <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_7rem_2.5rem] gap-4 border-b border-line bg-sunken px-4 py-2 text-label font-medium text-ink-3 md:grid">
              <span>Role</span>
              <span>Match score</span>
              <span>Review</span>
              <span>Updated</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-line bg-panel">
              {applications.map((a) => {
                const s = a.tailoring_session_id ? byId.get(a.tailoring_session_id) : undefined;
                const changes = (s?.changes ?? []) as TailoredChange[];
                const toVerify = changes.filter((c) => c.flags.length > 0).length;
                return (
                  <li
                    key={a.id}
                    className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-hover md:grid-cols-[minmax(0,1fr)_9rem_8rem_7rem_2.5rem]"
                  >
                    <div className="min-w-0">
                      <Link href={`/resumes/${a.id}`} className="block truncate text-body font-medium text-ink after:absolute after:inset-0">
                        {a.job_title_snapshot ?? a.title}
                      </Link>
                      <p className="truncate text-small text-ink-3">{a.job_company_snapshot ?? "Company not named"}</p>
                    </div>
                    <ScoreDelta before={s?.score_before ?? null} after={s?.score_after ?? null} className="text-body" />
                    <div className="hidden md:block">
                      {toVerify > 0 ? (
                        <Badge tone="query">{toVerify} to verify</Badge>
                      ) : (
                        <span className="text-small text-ink-3">{changes.length} changes</span>
                      )}
                    </div>
                    <span className="hidden text-small text-ink-3 md:block">{formatRelativeTime(a.updated_at)}</span>
                    <div className="relative z-10 hidden justify-end md:flex">
                      <ResumeActions id={a.id} title={a.title} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {applications.length > 0 && (
          <Link href="/new" className="mt-4 inline-flex items-center gap-1.5 text-small text-brass hover:underline">
            Tailor for another job <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </section>
    </div>
  );
}
