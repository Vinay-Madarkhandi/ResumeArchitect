import { Check, Equal, Minus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container, DisplayHeading, Lede } from "./Section";
import { ScoreLockup } from "./ScoreLockup";

/** Example breakdown, labeled on the page. Before sums to 52, after to 81. */
const PARTS = [
  { name: "Must-haves", weight: 50, before: 24, after: 41, note: "Each required skill or experience the post names, found in a line of your resume." },
  { name: "Nice-to-haves", weight: 15, before: 6, after: 10, note: "The “bonus if you have” list, scored the same way." },
  { name: "Role keywords", weight: 20, before: 9, after: 17, note: "The terms this role is searched by, in the words the post uses." },
  { name: "ATS readability", weight: 15, before: 13, after: 13, note: "Standard headings, parseable dates and contact details, plain structure." },
];

const EVIDENCE = [
  { req: "Led a large-scale platform migration", line: "Led the migration of the billing service to Kafka…", met: true, gained: true },
  { req: "Production incident response", line: "Owned incident response for payments…", met: true, gained: true },
  { req: "Go or Rust in production", line: "Built Go services behind the invoicing API…", met: true, gained: false },
  { req: "Terraform", line: null, met: false, gained: false },
];

export function ScoreExplained() {
  return (
    <section id="score" aria-labelledby="score-title" className="scroll-mt-20 py-24 lg:py-32">
      <Container className="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <DisplayHeading id="score-title">A score that shows its working.</DisplayHeading>
          <Lede className="mt-5">
            The match score is computed in code, not by the AI. Four components, fixed weights, and for every
            requirement the line in your resume that satisfies it. If a number moves, you can see exactly which line
            moved it.
          </Lede>

          <div className="mt-10 rounded-lg border border-line bg-panel p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line-strong text-brass">
                <Equal className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-lead font-semibold text-ink">Same input, same score</h3>
                <p className="mt-1.5 text-small text-ink-2">
                  Run the same resume against the same job twice and you get the same number. That&rsquo;s what makes
                  the before and after a fair comparison instead of a mood.
                </p>
              </div>
            </div>
            <p className="mt-5 border-t border-line pt-4 text-small text-ink-3">
              ATS readability is a check on structure, not a promise. No tool can tell you how a specific employer&rsquo;s
              system will rank you, and we don&rsquo;t pretend to.
            </p>
          </div>
        </div>

        <figure className="min-w-0 rounded-lg border border-line bg-panel">
          <div className="border-b border-line p-5 sm:p-6">
            <ScoreLockup before={52} now={81} size="lg" />
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-ink-3" aria-hidden /> Points before tailoring
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-brass" aria-hidden /> Points gained
              </span>
            </p>
          </div>
          <ul className="divide-y divide-line">
            {PARTS.map((p) => (
              <li key={p.name} className="px-5 py-4 sm:px-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-body font-semibold text-ink">{p.name}</h3>
                  <span className="font-mono text-small text-ink-2 tabular">
                    <span className="text-ink">{p.after}</span>/{p.weight}
                    {p.after > p.before && <span className="ml-2 text-add">+{p.after - p.before}</span>}
                  </span>
                </div>
                <div
                  className="relative mt-2 h-1 overflow-hidden rounded-full bg-sunken"
                  role="img"
                  aria-label={`${p.name}: ${p.before} of ${p.weight} points before, ${p.after} after`}
                >
                  <span className="absolute inset-y-0 left-0 rounded-full bg-brass" style={{ width: `${(p.after / p.weight) * 100}%` }} />
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-ink-3"
                    style={{ width: `${(p.before / p.weight) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-label text-ink-3">{p.note}</p>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-5 sm:px-6">
            <h3 className="text-small font-semibold text-ink">Must-haves, with evidence</h3>
            <ul className="mt-3 space-y-3">
              {EVIDENCE.map((e) => (
                <li key={e.req} className="flex gap-2.5">
                  {e.met ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-add" aria-label="Met" />
                  ) : (
                    <Minus className="mt-0.5 size-4 shrink-0 text-ink-3" aria-label="Not found" />
                  )}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-small text-ink">
                      {e.req}
                      {e.gained && <Badge tone="add">new</Badge>}
                    </p>
                    <p className="mt-0.5 text-label text-ink-3">
                      {e.line ? <q className="italic">{e.line}</q> : "Not in your resume. Add it yourself with “I have this” if it’s true."}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="border-t border-line px-5 py-3 text-label text-ink-3 sm:px-6">
            Example breakdown for an example resume and job.
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}
