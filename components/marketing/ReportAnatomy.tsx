import { Container, DisplayHeading, Lede } from "./Section";

const RUBRIC_DIMENSIONS = [
  {
    name: "Hard technical competencies",
    weight: "45 points",
    body: "Every technical skill extracted from the job requirements is inspected for exact match, verified synonym (such as TS for TypeScript), or omission, weighted by how critically the posting emphasizes it.",
  },
  {
    name: "Job title and hierarchy alignment",
    weight: "15 points",
    body: "Verifies whether your previous job titles match the seniority and domain expectations of the target role, preventing automatic initial filtering by strict ATS parsers.",
  },
  {
    name: "Domain nomenclature and keywords",
    weight: "10 points",
    body: "Industry methodologies, operational acronyms, and specialized framework terminology identified across the job description.",
  },
  {
    name: "Document searchability and metadata",
    weight: "15 points",
    body: "Ensures contact information (email, phone, LinkedIn) resides in the primary body flow rather than header/footer bands that parsers frequently drop. Enforces standard section naming and ISO dates.",
  },
  {
    name: "Structural formatting invariants",
    weight: "10 points",
    body: "Detects parsing hazards in uploaded PDF and Word documents: multi-column tables, floating text boxes, vector decorations, non-standard glyphs, and font embedding problems.",
  },
  {
    name: "Recruiter heuristic metrics",
    weight: "5 points",
    body: "Evaluates quantitative bullet structures (metrics, percentages, revenue, latency), overall document density, and flags overused corporate buzzwords.",
  },
];

export function ReportAnatomy() {
  return (
    <section id="report" aria-labelledby="report-title" className="scroll-mt-20 border-y border-line bg-panel/30 py-20 lg:py-28">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <DisplayHeading id="report-title">Deterministic scoring. Clear mathematical provenance.</DisplayHeading>
          <Lede className="mt-4">
            Gemini parses the job posting once into an immutable schema of requirements, titles, and competencies. Your resume is scored against that schema deterministically in code.
          </Lede>
          <div className="mt-6 rounded-lg border border-line bg-ground/80 p-4 font-mono text-label text-ink-3">
            <p className="text-ink-2 font-medium">Why deterministic scoring matters</p>
            <p className="mt-1 leading-relaxed">
              Rescanning the same resume and job yields the exact same score every time. No random LLM score drift, no unpredictable black-box rankings.
            </p>
          </div>
        </div>

        <div className="border-t border-line">
          {RUBRIC_DIMENSIONS.map((p) => (
            <div
              key={p.name}
              className="grid gap-2 border-b border-line/80 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
            >
              <div>
                <dt className="text-body font-semibold text-ink">{p.name}</dt>
                <dd className="mt-0.5 font-mono text-label font-medium text-brass">{p.weight}</dd>
              </div>
              <dd className="text-small text-pretty text-ink-2 leading-relaxed">{p.body}</dd>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
