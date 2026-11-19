import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

const BREAKDOWN = [
  { label: "Hard skills", got: 31, of: 45 },
  { label: "Job title", got: 15, of: 15 },
  { label: "Soft skills", got: 6, of: 10 },
  { label: "Formatting", got: 5, of: 5 },
];

const SKILLS = [
  { w: "Kafka", hit: true },
  { w: "PostgreSQL", hit: true },
  { w: "Go", hit: true },
  { w: "incident response", hit: true },
  { w: "Kubernetes", hit: false },
  { w: "gRPC", hit: false },
];

const CHECKS = [
  { label: "Email and phone in the body", ok: true },
  { label: "Standard section headings", ok: true },
  { label: "Two columns found", ok: false },
];

/** A static example report in the app's own parts: the figure, the breakdown, skill chips, and checks. */
export function MatchReportDemo() {
  return (
    <figure className="min-w-0" aria-label="Example match report">
      <div className="rounded-lg border border-line bg-panel">
        <div className="flex items-end justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-small text-ink-2">Senior Backend Engineer · Northwind Payments</p>
            <p className="mt-2 flex items-baseline gap-3">
              <span className="inline-block border-b-2 border-brass pb-1 font-mono text-[40px] font-medium leading-none text-ink tabular">
                72%
              </span>
              <span className="text-small text-ink-3">
                match rate · target <span className="font-mono tabular">75%</span>
              </span>
            </p>
          </div>
        </div>

        <dl className="grid gap-3 border-b border-line px-5 py-4">
          {BREAKDOWN.map((c) => (
            <div key={c.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.25rem] items-center gap-3">
              <dt className="text-small text-ink-2">{c.label}</dt>
              <dd className="h-1 rounded-full bg-sunken" aria-hidden>
                <span className="block h-full rounded-full bg-brass" style={{ width: `${(c.got / c.of) * 100}%` }} />
              </dd>
              <dd className="text-right font-mono text-label text-ink-3 tabular">
                {c.got}/{c.of}
              </dd>
            </div>
          ))}
        </dl>

        <div className="border-b border-line px-5 py-4">
          <p className="text-small font-medium text-ink-2">Hard skills</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Skills from the job post">
            {SKILLS.map((k) => (
              <li
                key={k.w}
                className={cn(
                  "rounded-sm border px-2 py-0.5 text-small",
                  k.hit ? "border-add/40 text-add" : "border-dashed border-line-strong text-ink-3",
                )}
              >
                {!k.hit && <span className="sr-only">Missing: </span>}
                {k.w}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 py-4">
          <p className="text-small font-medium text-ink-2">Searchability</p>
          <ul className="mt-2 grid gap-1.5">
            {CHECKS.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-small text-ink-2">
                {c.ok ? <Check className="size-3.5 text-add" aria-hidden /> : <X className="size-3.5 text-del" aria-hidden />}
                <span className={cn(!c.ok && "line-through decoration-del/70")}>{c.label}</span>
                <span className="sr-only">{c.ok ? "passed" : "needs attention"}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="mt-3 text-label text-ink-3">Example data. A real report adds recruiter tips, predicted skills and ATS tips.</figcaption>
    </figure>
  );
}
