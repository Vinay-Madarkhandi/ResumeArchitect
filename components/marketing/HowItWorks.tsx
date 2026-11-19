import { Container, DisplayHeading, Lede } from "./Section";

const STEPS = [
  {
    name: "Add a resume and a job",
    body: "Pick a saved resume, upload a PDF or Word file, or paste text. Paste the job post, or import it from its link.",
  },
  {
    name: "Read the match report",
    body: "A match rate out of 100 with the breakdown behind it: skills found and missing, searchability, formatting and recruiter tips.",
  },
  {
    name: "Fix it, then rescan",
    body: "Edit beside the report with the score updating, or have Gemini tailor the resume line by line. Every scan is saved so you can see the number move.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-t border-line py-24 lg:py-32">
      <Container>
        <div className="max-w-3xl">
          <DisplayHeading id="how-title">Scan, read, fix, scan again.</DisplayHeading>
          <Lede className="mt-5">
            The loop takes a couple of minutes per job, and rescanning a job you&rsquo;ve already read doesn&rsquo;t need
            your key.
          </Lede>
        </div>
        <ol className="relative mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          <span aria-hidden className="absolute bottom-3 left-3 top-3 w-px bg-brass/70 lg:bottom-auto lg:left-3 lg:right-3 lg:top-3 lg:h-px lg:w-auto" />
          {STEPS.map((s, i) => (
            <li key={s.name} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-5 lg:block">
              <span className="relative z-10 flex size-6 items-center justify-center rounded-full border border-brass bg-ground font-mono text-[11px] text-brass tabular">
                {i + 1}
              </span>
              <div className="lg:mt-6 lg:pr-4">
                <h3 className="text-lead font-semibold text-ink">{s.name}</h3>
                <p className="mt-2 max-w-sm text-small text-pretty text-ink-2">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
