import { Container, DisplayHeading, Lede } from "./Section";

const PARTS = [
  { name: "Hard skills", body: "Each skill the job asks for, marked found, found by synonym (JS for JavaScript) or missing, with how much the posting stresses it." },
  { name: "Soft skills and other keywords", body: "The interpersonal skills and industry terms the posting names, checked the same way." },
  { name: "Job title and education", body: "Whether your titles line up with the role and your degree meets what the posting asks for." },
  { name: "Searchability", body: "Name, email, phone and LinkedIn in the body of the document, a summary, standard section headings, consistent dates and a file type parsers accept." },
  { name: "Formatting", body: "For uploaded PDF and Word files: tables, columns, text boxes, images, headers and footers, fonts and special characters that parsers trip over." },
  { name: "Recruiter tips", body: "Measurable results, length, overused phrases, links to your web presence and whether your level matches the role." },
  { name: "Predicted skills", body: "Skills the role usually needs that the posting never names, each with a one-line reason." },
  { name: "ATS tips", body: "Paste the job link and the report names the applicant tracking system behind it, with guidance for that system." },
];

export function ReportAnatomy() {
  return (
    <section id="report" aria-labelledby="report-title" className="scroll-mt-20 border-y border-line bg-panel/50 py-24 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <DisplayHeading id="report-title">What a match report tells you.</DisplayHeading>
          <Lede className="mt-5">
            Gemini reads the job post once into a list of skills, a title, a level and an education requirement. Your
            resume is then scored against that list in code, so the same resume and job give the same number every time.
          </Lede>
          <p className="mt-5 max-w-[34rem] text-small text-ink-3">
            The weights are our own estimates and are listed in the breakdown, with hard skills carrying the most. The
            match rate is not any other tool&rsquo;s number, and it can&rsquo;t promise how a particular employer ranks you.
          </p>
        </div>
        <dl className="border-t border-line">
          {PARTS.map((p) => (
            <div key={p.name} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8">
              <dt className="text-body font-semibold text-ink">{p.name}</dt>
              <dd className="text-body text-pretty text-ink-2">{p.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
