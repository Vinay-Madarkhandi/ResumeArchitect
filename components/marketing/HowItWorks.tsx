import { Container, DisplayHeading, Lede } from "./Section";

const STAGES = [
  { name: "Read the job", outcome: "The must-haves, nice-to-haves and role keywords, pulled out of the posting." },
  { name: "Measure your resume", outcome: "Your starting score against those requirements, before a word changes." },
  { name: "Rewrite lines", outcome: "Your real experience, reworded toward the role. Nothing is invented." },
  { name: "Proof every change", outcome: "Each edit checked against your original. Unbacked claims get a Verify flag." },
  { name: "Score and save", outcome: "The same yardstick, after. A fair before and after, saved with the application." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 py-24 lg:py-32">
      <Container>
        <div className="max-w-3xl">
          <DisplayHeading id="how-title">Five steps you can watch, not a spinner and a surprise.</DisplayHeading>
          <Lede className="mt-5">
            Tailoring runs as a composing stick. Each stage reports what it found as it finishes, so you know what the
            AI read, what it measured, and what it touched.
          </Lede>
        </div>

        <ol className="relative mt-16 grid gap-10 lg:grid-cols-5 lg:gap-6">
          <span
            aria-hidden
            className="absolute bottom-3 left-3 top-3 w-px bg-brass/70 lg:bottom-auto lg:left-3 lg:right-3 lg:top-3 lg:h-px lg:w-auto"
          />
          {STAGES.map((s, i) => (
            <li key={s.name} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-5 lg:block">
              <span className="relative z-10 flex size-6 items-center justify-center rounded-full border border-brass bg-ground font-mono text-[11px] text-brass tabular">
                {i + 1}
              </span>
              <div className="lg:mt-6 lg:pr-2">
                <h3 className="text-lead font-semibold text-ink">{s.name}</h3>
                <p className="mt-2 text-small text-pretty text-ink-2">{s.outcome}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
