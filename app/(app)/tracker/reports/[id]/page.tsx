import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { getJobReport } from "@/lib/data/jobs";

const checks = z.array(z.object({ label: z.string(), status: z.string(), detail: z.string(), fix: z.string().nullish() }));
const skills = z.array(z.object({ term: z.string(), status: z.string(), advice: z.string().nullish() }));
const reportFields = z.object({
  verdict: z.object({ message: z.string() }).optional(),
  breakdown: z.array(z.object({ label: z.string(), points: z.number() })).optional(),
  hardSkills: skills.optional(),
  softSkills: skills.optional(),
  predictedSkills: skills.optional(),
  searchability: checks.optional(),
  formatting: checks.optional(),
  recruiterTips: checks.optional(),
});

export default async function JobReportPage({ params }: PageProps<"/tracker/reports/[id]">) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const scan = await getJobReport(user.id, id);
  if (!scan) notFound();

  const report = reportFields.safeParse(scan.report).data;
  const skillGroups = [
    ["Hard skills", report?.hardSkills],
    ["Soft skills", report?.softSkills],
    ["Predicted skills", report?.predictedSkills],
  ] as const;
  const checkGroups = [
    ["Searchability", report?.searchability],
    ["Formatting", report?.formatting],
    ["Recruiter tips", report?.recruiterTips],
  ] as const;
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link className="text-small text-brass hover:underline" href={`/tracker?job=${scan.jobId}`}>Back to job</Link>
      <header>
        <h1 className="text-page font-semibold">Match report</h1>
        <p className="mt-1 text-body text-ink-2">{scan.title}</p>
        <p className="mt-3 text-title font-semibold"><span className="font-mono">{scan.matchRate}%</span> match</p>
        {report?.verdict && <p className="mt-1 text-body text-ink-2">{report.verdict.message}</p>}
      </header>
      {!!report?.breakdown?.length && (
        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="mb-2 text-lead font-semibold">Score breakdown</h2>
          <dl className="divide-y divide-line text-small">
            {report.breakdown.map(({ label, points }) => <div key={label} className="flex justify-between gap-4 py-2">
              <dt>{label}</dt><dd className="font-mono">{Number(points.toFixed(1))}</dd>
            </div>)}
          </dl>
        </section>
      )}
      {skillGroups.map(([label, entries]) => !!entries?.length && (
        <section key={label} className="rounded-lg border border-line bg-panel p-4">
          <h2 className="mb-2 text-lead font-semibold">{label}</h2>
          <ul className="divide-y divide-line text-small">
            {entries.map(({ term, status, advice }) => <li key={term} className="py-2">
              <span className="font-medium">{term}</span> <span className="text-ink-3">· {status}</span>
              {advice && <p className="text-ink-2">{advice}</p>}
            </li>)}
          </ul>
        </section>
      ))}
      {checkGroups.map(([label, entries]) => !!entries?.length && (
        <section key={label} className="rounded-lg border border-line bg-panel p-4">
          <h2 className="mb-2 text-lead font-semibold">{label}</h2>
          <ul className="divide-y divide-line text-small">
            {entries.map(({ label, status, detail, fix }) => <li key={label} className="py-2">
              <span className="font-medium">{label}</span> <span className="text-ink-3">· {status}</span>
              <p className="text-ink-2">{detail}</p>
              {fix && <p className="text-ink-2">{fix}</p>}
            </li>)}
          </ul>
        </section>
      ))}
      {scan.resumeId && <Link className="text-small text-brass hover:underline" href={`/resumes/${scan.resumeId}`}>Open resume</Link>}
    </article>
  );
}
