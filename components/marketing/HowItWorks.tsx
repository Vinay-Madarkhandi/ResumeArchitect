import { Container, DisplayHeading, Lede } from "./Section";

const PHASES = [
  {
    phase: "01",
    title: "Document AST Ingestion",
    body: "Upload any PDF, DOCX, or plain text document. The parser strips floating textboxes, nested tables, and vector decorations into an ATS-compliant single-stream document tree.",
    spec: "Linear text stream · Standard semantic headings (H1/H2/H3)",
  },
  {
    phase: "02",
    title: "Lexical & Token Matching",
    body: "Gemini tokenizes the target job post once. The resume is scored deterministically against hard competencies, role titles, and domain synonyms directly in server memory.",
    spec: "Weighted ATS rubric · Verifiable keyword provenance",
  },
  {
    phase: "03",
    title: "Direct Canvas Proofing",
    body: "Refine your resume in real time on an authentic A4 proof sheet with Sejda-style inline controls. Scores update immediately with zero hallucination risk.",
    spec: "Real-time delta score · 100% byte-accurate PDF and Word export",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-t border-line py-20 lg:py-28">
      <Container>
        <div className="max-w-3xl">
          <DisplayHeading id="how-title">Three deterministic phases. Zero guesswork.</DisplayHeading>
          <Lede className="mt-4">
            Every analysis runs locally in your server memory. The engine decomposes document geometry, calculates lexical match density, and enables immediate typographic edits.
          </Lede>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PHASES.map((p) => (
            <div
              key={p.phase}
              className="flex flex-col justify-between rounded-xl border border-line bg-panel/40 p-6 transition-colors hover:border-brass/40"
            >
              <div>
                <div className="flex items-center justify-between border-b border-line/60 pb-3">
                  <span className="font-mono text-label uppercase tracking-widest text-brass">
                    Phase {p.phase}
                  </span>
                  <span className="size-1.5 rounded-full bg-brass/60" />
                </div>
                <h3 className="mt-4 text-lead font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-pretty text-ink-2">{p.body}</p>
              </div>

              <div className="mt-6 border-t border-line/50 pt-3">
                <p className="font-mono text-[11px] text-ink-3">{p.spec}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
