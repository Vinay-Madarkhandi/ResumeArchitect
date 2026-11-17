import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, CircleAlert, FileText, Plus, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { buttonVariants } from "@/components/ui/Button";
import { ResumeActions } from "@/components/dashboard/ResumeActions";
import { ApplicationsTable, type ApplicationRow } from "@/components/dashboard/ApplicationsTable";
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
      .select("id, kind, title, status, is_default, updated_at, job_title_snapshot, job_company_snapshot, tailoring_session_id, application_status")
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

  const rows: ApplicationRow[] = applications.map((a) => {
    const s = a.tailoring_session_id ? byId.get(a.tailoring_session_id) : undefined;
    const changes = (s?.changes ?? []) as TailoredChange[];
    return {
      id: a.id,
      title: a.title,
      role: a.job_title_snapshot ?? a.title,
      company: a.job_company_snapshot,
      status: a.application_status,
      before: s?.score_before ?? null,
      after: s?.score_after ?? null,
      changes: changes.length,
      toVerify: changes.filter((c) => c.flags.length > 0).length,
      updatedLabel: formatRelativeTime(a.updated_at),
    };
  });
  const scored = rows.filter((r) => r.before !== null && r.after !== null);
  const avgLift = scored.length ? Math.round(scored.reduce((sum, r) => sum + (r.after! - r.before!), 0) / scored.length) : null;
  const active = rows.filter((r) => r.status === "applied" || r.status === "interviewing").length;
  const interviews = rows.filter((r) => r.status === "interviewing" || r.status === "offer").length;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page font-semibold tracking-[-0.015em]">Applications</h1>
          <p className="mt-1.5 text-body text-ink-2">One tailored resume per job, each measured against its posting.</p>
        </div>
      </div>

      {rows.length > 0 && (
        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-line [&>div]:bg-panel sm:grid-cols-4 gap-px">
          {[
            { label: "Applications", value: String(rows.length), note: `${active} in progress` },
            { label: "Average score lift", value: avgLift === null ? "—" : `${avgLift > 0 ? "+" : ""}${avgLift}`, note: "points after tailoring" },
            { label: "Interviews", value: String(interviews), note: "interviewing or offer" },
            {
              label: "To verify",
              value: String(rows.reduce((n, r) => n + r.toVerify, 0)),
              note: "changes to double-check",
            },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-3.5">
              <dt className="text-label text-ink-3">{stat.label}</dt>
              <dd className="mt-1 font-mono text-[22px] leading-none text-ink tabular">{stat.value}</dd>
              <dd className="mt-1.5 text-label text-ink-3">{stat.note}</dd>
            </div>
          ))}
        </dl>
      )}

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
          <ApplicationsTable rows={rows} />
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
