import { Check, CircleAlert, Equal, Minus, X } from "lucide-react";
import type { Check as ReportCheck, CheckStatus, PredictedSkillMatch, ScoreComponent, SkillMatch, SkillStatus } from "@/lib/report/report";
import type { Importance } from "@/lib/schemas/jobFacts";
import { cn } from "@/lib/cn";

/**
 * The pieces of a Match Report, shared by the report page and the live
 * Power Edit panel. Every state carries an icon and a word as well as a
 * color (DESIGN.md, the Line-Form Rule).
 */

const IMPORTANCE: Record<Importance, string> = { high: "High", medium: "Medium", low: "Low" };

export function MatchRateFigure({ rate, target, size = "lg" }: { rate: number; target: number; size?: "lg" | "md" }) {
  const reached = rate >= target;
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span
          className={cn("font-mono font-medium leading-none text-ink tabular", size === "lg" ? "text-[40px]" : "text-[26px]")}
          aria-label={`Match rate ${rate}%`}
          data-testid="match-rate"
        >
          {rate}
          <span className="text-ink-3">%</span>
        </span>
        <span className="text-small text-ink-3">match</span>
      </p>
      <div className="relative mt-3 h-1.5 rounded-full bg-sunken" role="img" aria-label={`${rate}% of a ${target}% target`}>
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-[var(--ease-out-expo)]", reached ? "bg-add" : "bg-brass")}
          style={{ width: `${rate}%` }}
        />
        <span className="absolute -inset-y-1 w-0.5 rounded-full bg-ink-2" style={{ left: `${target}%` }} aria-hidden />
      </div>
      <p className="mt-1.5 flex justify-between text-label text-ink-3">
        <span>{reached ? "Target reached" : `${target - rate} points to go`}</span>
        <span>
          Target <span className="font-mono tabular">{target}%</span>
        </span>
      </p>
    </div>
  );
}

export function Breakdown({ components }: { components: ScoreComponent[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {components.map((c) => (
        <li key={c.id}>
          <div className="flex items-baseline justify-between gap-3 text-small">
            <span className="text-ink">{c.label}</span>
            <span className="font-mono text-ink-2 tabular">
              {Number(c.points.toFixed(1))}
              <span className="text-ink-3">/{Math.round(c.weight * 100)}</span>
            </span>
          </div>
          <div className="relative mt-1.5 h-1 rounded-full bg-sunken" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-brass transition-[width] duration-300 ease-[var(--ease-out-expo)]"
              style={{ width: `${c.ratio * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SKILL_STATUS: Record<SkillStatus, { label: string; className: string; icon: typeof Check }> = {
  found: { label: "Found", className: "text-add", icon: Check },
  synonym: { label: "Synonym", className: "text-brass", icon: Equal },
  missing: { label: "Missing", className: "text-del", icon: Minus },
};

export function SkillStatusMark({ status, form }: { status: SkillStatus; form?: string | null }) {
  const { label, className, icon: Icon } = SKILL_STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-small", className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
      {status === "synonym" && form && <span className="text-ink-3">as &ldquo;{form}&rdquo;</span>}
    </span>
  );
}

/** Skills as Jobscan lays them out: how often the posting and the resume mention each, and whether it's there. */
export function SkillTable({ skills, label }: { skills: SkillMatch[]; label: string }) {
  if (skills.length === 0) return <p className="text-small text-ink-3">The posting doesn&rsquo;t list any.</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-small">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-line text-label text-ink-3">
            <th scope="col" className="px-1 py-2 font-medium">Skill</th>
            <th scope="col" className="px-1 py-2 font-medium">Importance</th>
            <th scope="col" className="px-1 py-2 text-right font-medium">Job</th>
            <th scope="col" className="px-1 py-2 text-right font-medium">Resume</th>
            <th scope="col" className="py-2 pl-4 pr-1 font-medium">In your resume</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((s) => (
            <tr key={s.term} className="border-b border-line align-top last:border-b-0">
              <th scope="row" className="px-1 py-2.5 font-medium text-ink">
                <span className={cn(s.status === "missing" && "rounded-sm border border-dashed border-del/60 px-1.5 py-px")}>{s.term}</span>
                {s.advice && <p className="mt-1.5 max-w-prose font-normal text-ink-2">{s.advice}</p>}
              </th>
              <td className="px-1 py-2.5 text-ink-2">{IMPORTANCE[s.importance]}</td>
              <td className="px-1 py-2.5 text-right font-mono text-ink-2 tabular">{s.jdCount}</td>
              <td className="px-1 py-2.5 text-right font-mono text-ink-2 tabular">{s.resumeCount}</td>
              <td className="py-2.5 pl-4 pr-1">
                <SkillStatusMark status={s.status} form={s.matchedForm} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CHECK_STATUS: Record<CheckStatus, { label: string; className: string; icon: typeof Check }> = {
  pass: { label: "Pass", className: "text-add", icon: Check },
  warn: { label: "Check", className: "text-brass", icon: CircleAlert },
  fail: { label: "Fail", className: "text-del", icon: X },
};

export function CheckList({ checks }: { checks: ReportCheck<string>[] }) {
  if (checks.length === 0) return <p className="text-small text-ink-3">Nothing to check here.</p>;
  return (
    <ul className="flex flex-col">
      {checks.map((c) => {
        const { label, className, icon: Icon } = CHECK_STATUS[c.status];
        return (
          <li key={c.id} className="flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
            <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-body text-ink">
                <span className="font-medium">{c.label}</span>
                <span className={cn("text-label", className)}>{label}</span>
              </p>
              <p className="mt-0.5 text-small text-ink-2">{c.detail}</p>
              {c.fix && (
                <p className="mt-1.5 border-l-2 border-brass pl-2.5 text-small text-ink">
                  <span className="sr-only">How to fix: </span>
                  {c.fix}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PredictedSkills({ skills }: { skills: PredictedSkillMatch[] }) {
  if (skills.length === 0) return <p className="text-small text-ink-3">No unlisted skills predicted for this role.</p>;
  return (
    <ul className="flex flex-col">
      {skills.map((s) => (
        <li key={s.term} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-2.5 first:border-t-0 first:pt-0">
          <div className="min-w-0 flex-1 basis-60">
            <p className="text-body font-medium text-ink">{s.term}</p>
            {s.reason && <p className="mt-0.5 text-small text-ink-2">{s.reason}</p>}
            {s.advice && <p className="mt-0.5 text-small text-ink-2">{s.advice}</p>}
          </div>
          <SkillStatusMark status={s.status} form={s.matchedForm} />
        </li>
      ))}
    </ul>
  );
}

/** Items that need the user: missing or synonym skills, and checks that don't pass. */
export function issueCount(items: Array<{ status: string }>): number {
  return items.filter((i) => i.status !== "found" && i.status !== "pass").length;
}
