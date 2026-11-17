import { Badge } from "@/components/ui/Badge";
import { Container, DisplayHeading, Lede } from "./Section";

const OPAQUE_LINES = [
  "Spearheaded a transformative, cross-functional billing modernization initiative",
  "Leveraged cutting-edge event streaming to drive best-in-class outcomes",
  "Orchestrated world-class incident management at enterprise scale",
  "Championed a culture of operational excellence across 6 teams",
];

const ITEMS = [
  { kind: "Rewrite", del: "Worked on", ins: "Led", why: "Must-have: led a platform migration", pts: 9 },
  { kind: "Rewrite", del: "Kafka-driven", ins: "event-driven Kafka", why: "Nice-to-have: event-driven systems", pts: 8 },
  { kind: "Added line", ins: "Owned incident response for payments", why: "Must-have: incident response", pts: 12, verify: true },
];

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="border-y border-line bg-sunken/60 py-24 lg:py-28">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <DisplayHeading id="problem-title">Most AI rewrites hand back a new resume and ask you to trust it.</DisplayHeading>
          <Lede className="lg:pb-1.5">
            You can&rsquo;t tell which words moved, why they moved, or whether a number you&rsquo;ll be asked about in
            the interview was made up along the way. A resume you can&rsquo;t account for is a risk, not a shortcut.
          </Lede>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
          <figure className="flex flex-col bg-ground p-6 sm:p-8">
            <figcaption className="flex items-baseline justify-between gap-3">
              <span className="text-lead font-semibold text-ink">A black-box rewrite</span>
              <span className="text-small text-ink-3">“Your resume has been optimized.”</span>
            </figcaption>
            <div className="relative mt-6 flex-1 select-none" aria-hidden>
              <div className="paper px-6 py-6 blur-[3px] opacity-80" data-template="classic">
                <div className="paper-flow">
                  <h2 style={{ marginTop: 0 }}>Experience</h2>
                  {OPAQUE_LINES.map((l) => (
                    <div key={l} className="rl-bullet">
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ul className="mt-6 space-y-1.5 text-small text-ink-3">
              <li>No record of what changed</li>
              <li>No reason given for any line</li>
              <li>All or nothing: accept it or start over</li>
            </ul>
          </figure>

          <figure className="flex flex-col bg-ground p-6 sm:p-8">
            <figcaption className="flex items-baseline justify-between gap-3">
              <span className="text-lead font-semibold text-ink">An itemized redline</span>
              <span className="text-small text-ink-3">
                <span className="font-mono tabular">3</span> changes, each one yours to decide
              </span>
            </figcaption>
            <ol className="mt-6 flex-1 divide-y divide-line rounded-lg border border-line bg-panel">
              {ITEMS.map((it) => (
                <li key={it.why} className="slug-card px-4 py-3">
                  <div className="flex items-center gap-2 text-label">
                    <span className="font-medium text-ink-2">{it.kind}</span>
                    {it.verify && <Badge tone="query">Verify</Badge>}
                    <span className="ml-auto font-mono text-add tabular">+{it.pts} pts</span>
                  </div>
                  <p className="mt-1.5 text-small text-ink">
                    {it.del && <del className="mark-del">{it.del}</del>} <ins className="mark-add">{it.ins}</ins>
                  </p>
                  <p className="mt-1 text-label text-ink-3">{it.why}</p>
                </li>
              ))}
            </ol>
            <ul className="mt-6 space-y-1.5 text-small text-ink-2">
              <li>Every word that moved, struck and underlined</li>
              <li>A written reason tied to the job post</li>
              <li>Keep or revert one change at a time</li>
            </ul>
          </figure>
        </div>
        <p className="mt-4 text-label text-ink-3">Example resume and job, for illustration.</p>
      </Container>
    </section>
  );
}
