import { describe, expect, it } from "vitest";
import { AlignmentType, Document, LevelFormat, Packer, Paragraph, Tab, TabStopType, TextRun } from "docx";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { docxToDocument } from "@/lib/docx/inPlace";
import type { JobFacts } from "@/lib/schemas/jobFacts";
import { inspectDocx } from "./inspectDocx";
import { buildMatchReport } from "./matchReport";
import type { MatchReport } from "./report";

/**
 * Two realistic resume and posting pairs, run end to end. The expected
 * values were worked out by hand from the fixtures and the documented
 * weights, so a change that moves any of them is a change in what users see.
 */

const asOf = new Date(2026, 10, 18);

function skills(list: MatchReport["hardSkills"]) {
  return list.map((s) => [s.term, s.status, s.jdCount, s.resumeCount, s.matchedForm]);
}

function statuses(checks: { id: string; status: string }[]) {
  return Object.fromEntries(checks.map((c) => [c.id, c.status]));
}

describe("golden: senior backend engineer, Word file", () => {
  const POSTING = `Senior Backend Engineer – Payments (Remote, US)

About the role
You'll design and run the services that move money for 4 million merchants. You'll own APIs end to end, from design review to on-call.

What you'll do
- Build and operate high-throughput services in Go
- Design PostgreSQL schemas and tune queries under load
- Run our services on Kubernetes in AWS
- Own CI/CD pipelines and infrastructure as code (Terraform)
- Partner with product and risk teams; communicate trade-offs clearly

Requirements
- 5+ years of backend engineering experience
- Expert in Go; production experience with PostgreSQL
- Experience with Kubernetes and AWS
- Experience with Kafka or another event streaming platform
- Strong communication and mentoring skills
- Bachelor's degree in Computer Science or equivalent experience

Nice to have
- gRPC
- Payments or fintech domain experience`;

  const JOB: JobFacts = {
    title: "Senior Backend Engineer",
    level: "senior",
    hardSkills: [
      { term: "Go", importance: "high" },
      { term: "PostgreSQL", importance: "high" },
      { term: "Kubernetes", importance: "high" },
      { term: "AWS", importance: "high" },
      { term: "Kafka", importance: "medium" },
      { term: "CI/CD", importance: "medium" },
      { term: "Terraform", importance: "medium" },
      { term: "gRPC", importance: "low" },
      { term: "payments", importance: "low" },
    ],
    softSkills: [
      { term: "communication", importance: "high" },
      { term: "mentoring", importance: "medium" },
    ],
    education: { degree: "bachelor", fields: ["Computer Science"], equivalentExperience: true },
    yearsRequired: 5,
    predictedSkills: [
      { term: "Docker", reason: "Kubernetes services ship as containers." },
      { term: "Prometheus", reason: "On-call teams monitor with it." },
      { term: "Redis", reason: "Payment services cache hot reads." },
    ],
  };

  async function resumeFile(): Promise<Buffer> {
    const bullet = (text: string) => new Paragraph({ numbering: { reference: "dots", level: 0 }, children: [new TextRun(text)] });
    const heading = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 26 })] });
    const role = (title: string, dates: string) =>
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 10000 }],
        children: [new TextRun({ text: title, bold: true }), new TextRun({ children: [new Tab(), dates] })],
      });
    const doc = new Document({
      styles: { default: { document: { run: { font: "Calibri" } } } },
      numbering: { config: [{ reference: "dots", levels: [{ level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT }] }] },
      sections: [
        {
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ada Lovelace", bold: true, size: 36 })] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("ada@example.com | +1 415 555 0100 | linkedin.com/in/ada-lovelace | github.com/ada")],
            }),
            heading("Summary"),
            new Paragraph(
              "Backend engineer with 7 years building payment services in Golang and Postgres. Clear communication with product and risk teams; I own services from design to on-call.",
            ),
            heading("Work Experience"),
            role("Backend Engineer, Acme Pay", "Jan 2021 – Present"),
            bullet("Built Golang services on Postgres that process 3M payment events a day"),
            bullet("Moved 40 services to Kubernetes on AWS, cutting infrastructure cost 30%"),
            bullet("Responsible for the CI/CD pipeline; cut deploy time from 25 to 6 minutes"),
            bullet("Mentored 4 engineers through promotion"),
            role("Software Engineer, Shopwise", "Jun 2018 – Dec 2020"),
            bullet("Built Kafka consumers for order events, handling 12k messages per second"),
            bullet("Wrote Terraform modules for 15 AWS accounts"),
            bullet("Worked on Docker build tooling"),
            heading("Education"),
            new Paragraph("B.S. Computer Science, State University\tAug 2014 – May 2018"),
            heading("Skills"),
            new Paragraph("Go, Postgres, Kubernetes, AWS, Kafka, Terraform, Docker, Redis"),
          ],
        },
      ],
    });
    return Packer.toBuffer(doc);
  }

  async function report() {
    const file = await resumeFile();
    return buildMatchReport({ job: JOB, jobText: POSTING, resume: await docxToDocument(file), file: await inspectDocx(file), asOf });
  }

  it("matches each hard skill, crediting Golang and Postgres as the posting's Go and PostgreSQL", async () => {
    const r = await report();
    expect(skills(r.hardSkills)).toEqual([
      ["Go", "found", 2, 3, "Go"],
      ["PostgreSQL", "synonym", 2, 3, "Postgres"],
      ["Kubernetes", "found", 2, 2, "Kubernetes"],
      ["AWS", "found", 2, 3, "AWS"],
      ["Kafka", "found", 1, 2, "Kafka"],
      ["CI/CD", "found", 1, 1, "CI/CD"],
      ["Terraform", "found", 1, 2, "Terraform"],
      ["payments", "found", 2, 2, "payment"],
      ["gRPC", "missing", 1, 0, null],
    ]);
    expect(r.hardSkills[1].advice).toBe(`Your resume says "Postgres" but the posting says "PostgreSQL". Use the posting's spelling at least once.`);
  });

  it("finds communication but not mentoring, which the resume only implies with 'Mentored'", async () => {
    expect(skills((await report()).softSkills)).toEqual([
      ["communication", "found", 1, 1, "communication"],
      ["mentoring", "missing", 1, 0, null],
    ]);
  });

  it("passes searchability except the title, which lacks 'Senior'", async () => {
    const r = await report();
    expect(statuses(r.searchability)).toEqual({
      "contact-name": "pass",
      "contact-email": "pass",
      "contact-phone": "pass",
      "contact-linkedin": "pass",
      summary: "pass",
      "section-headings": "pass",
      "date-format": "pass",
      "education-match": "pass",
      "job-title-match": "warn",
      "file-type": "pass",
    });
    expect(r.searchability.find((c) => c.id === "job-title-match")!.detail).toBe(
      `Your resume says "Backend Engineer", but the posting's title is "Senior Backend Engineer".`,
    );
  });

  it("reads the Word file as clean on every formatting check", async () => {
    expect(statuses((await report()).formatting)).toEqual({
      tables: "pass",
      "header-footer": "pass",
      images: "pass",
      columns: "pass",
      "text-boxes": "pass",
      fonts: "pass",
      "special-characters": "pass",
    });
  });

  it("gives recruiter tips with the numbers behind them", async () => {
    const r = await report();
    expect(statuses(r.recruiterTips)).toEqual({
      "measurable-results": "pass",
      "word-count": "fail",
      "words-to-avoid": "warn",
      "web-presence": "pass",
      "job-level-match": "pass",
    });
    const detail = (id: string) => r.recruiterTips.find((c) => c.id === id)!.detail;
    expect(detail("measurable-results")).toMatch(/^7 of your 8 achievement lines include a number/);
    expect(detail("word-count")).toBe("Your resume has 135 words. For a senior role, 800–1100 reads as complete without padding.");
    expect(detail("words-to-avoid")).toBe('Found "responsible for", "worked on". Recruiters skim past these.');
    expect(detail("job-level-match")).toBe("Your dates add up to about 8.5 years of experience; the posting asks for 5+ years.");
  });

  it("suggests the predicted skills the resume lacks", async () => {
    expect((await report()).predictedSkills.map((p) => [p.term, p.status])).toEqual([
      ["Docker", "found"],
      ["Prometheus", "missing"],
      ["Redis", "found"],
    ]);
  });

  it("scores 81%, past the 75% target", async () => {
    const r = await report();
    expect(r.matchRate).toBe(81);
    expect(r.verdict).toEqual({
      target: 75,
      reached: true,
      message: "Strong match. You're past the 75% target; fix any red items and apply.",
    });
  });
});

describe("golden: marketing manager, pasted text", () => {
  const POSTING = `Marketing Manager, Growth
We're hiring a Marketing Manager to grow our B2B SaaS pipeline.

Responsibilities
- Plan and run paid campaigns across Google Ads and LinkedIn Ads
- Own SEO strategy and the content calendar
- Build reports in Google Analytics and HubSpot; track CAC and pipeline
- Run A/B testing on landing pages
- Manage a $500k annual budget

Requirements
- 3+ years of B2B marketing experience
- Hands-on with HubSpot or Salesforce
- Strong copywriting and project management skills
- Excellent communication and stakeholder management
- Bachelor's degree in Marketing, Business, or a related field

Nice to have: SQL, Webflow`;

  const JOB: JobFacts = {
    title: "Marketing Manager",
    level: "mid",
    hardSkills: [
      { term: "Google Ads", importance: "high" },
      { term: "SEO", importance: "high" },
      { term: "HubSpot", importance: "high" },
      { term: "B2B marketing", importance: "high" },
      { term: "Google Analytics", importance: "medium" },
      { term: "A/B testing", importance: "medium" },
      { term: "CAC", importance: "medium" },
      { term: "copywriting", importance: "medium" },
      { term: "project management", importance: "medium" },
      { term: "Salesforce", importance: "low" },
      { term: "SQL", importance: "low" },
      { term: "Webflow", importance: "low" },
    ],
    softSkills: [
      { term: "communication", importance: "high" },
      { term: "stakeholder management", importance: "medium" },
    ],
    education: { degree: "bachelor", fields: ["Marketing", "Business"], equivalentExperience: false },
    yearsRequired: 3,
    predictedSkills: [
      { term: "Marketing automation", reason: "Growth teams automate nurture flows." },
      { term: "Lead generation", reason: "Pipeline goals depend on it." },
      { term: "Canva", reason: "Small teams make their own ad creative." },
    ],
  };

  const RESUME = `# Priya Shah

priya.shah@example.com · (312) 555-0199 · Chicago, IL

## My Journey

### Digital Marketing Specialist · Brightline Software · 03/2022 – Present

- Responsible for paid search on AdWords and LinkedIn, managing a $40k monthly budget
- Grew organic traffic 85% with a search engine optimization program and weekly content calendar
- Built HubSpot dashboards tracking customer acquisition cost and pipeline for the sales team
- Ran split testing on 14 landing pages, lifting conversion 22%

### Marketing Coordinator · Lakeview Analytics · June 2020 – February 2022

- ★ Wrote copy for email campaigns and product pages
- Team player who helped with the B2B marketing plan and events

## Education

BA, Communications · University of Illinois · 2016 – 2020

## Skills

HubSpot, Google Analytics, Canva, Salesforce, copywriting, Excel`;

  const report = () => buildMatchReport({ job: JOB, jobText: POSTING, resume: markdownToDocument(RESUME), file: null, asOf });

  it("credits synonyms and tells the user which form the posting uses", () => {
    const r = report();
    expect(skills(r.hardSkills)).toEqual([
      ["HubSpot", "found", 2, 2, "HubSpot"],
      ["Google Ads", "synonym", 1, 1, "AdWords"],
      ["SEO", "synonym", 1, 1, "search engine optimization"],
      ["B2B marketing", "found", 1, 1, "B2B marketing"],
      ["Google Analytics", "found", 1, 1, "Google Analytics"],
      ["A/B testing", "synonym", 1, 1, "split testing"],
      ["CAC", "synonym", 1, 1, "customer acquisition cost"],
      ["copywriting", "found", 1, 1, "copywriting"],
      ["project management", "missing", 1, 0, null],
      ["Salesforce", "found", 1, 1, "Salesforce"],
      ["SQL", "missing", 1, 0, null],
      ["Webflow", "missing", 1, 0, null],
    ]);
    expect(r.hardSkills.find((s) => s.term === "SEO")!.advice).toBe(
      'Your resume says "search engine optimization" but the posting says "SEO". Write both, e.g. "search engine optimization (SEO)", so a search for either finds you.',
    );
  });

  it("matches soft skills", () => {
    expect(skills(report().softSkills)).toEqual([
      ["communication", "found", 1, 1, "Communications"],
      ["stakeholder management", "missing", 1, 0, null],
    ]);
  });

  it("flags the creative heading, missing summary, mixed dates, field of study, and title", () => {
    const r = report();
    expect(statuses(r.searchability)).toEqual({
      "contact-name": "pass",
      "contact-email": "pass",
      "contact-phone": "pass",
      "contact-linkedin": "warn",
      summary: "fail",
      "section-headings": "fail",
      "date-format": "warn",
      "education-match": "warn",
      "job-title-match": "fail",
    });
    const check = (id: string) => r.searchability.find((c) => c.id === id)!;
    expect(check("contact-linkedin").detail).toMatch(/^No LinkedIn URL was found/);
    expect(check("section-headings").fix).toBe('Rename: "My Journey" → "Work Experience".');
    expect(check("date-format").detail).toBe('Dates mix 3 styles: "03/2022", "June 2020", "2016".');
    expect(check("education-match").detail).toBe(
      "Your bachelor's degree meets the level, but the posting asks for it in Marketing or Business.",
    );
  });

  it("checks only characters for a pasted resume, and flags the star", () => {
    expect(statuses(report().formatting)).toEqual({ "special-characters": "warn" });
  });

  it("gives recruiter tips", () => {
    const r = report();
    expect(statuses(r.recruiterTips)).toEqual({
      "measurable-results": "warn",
      "word-count": "fail",
      "words-to-avoid": "warn",
      "web-presence": "fail",
      "job-level-match": "pass",
    });
    const detail = (id: string) => r.recruiterTips.find((c) => c.id === id)!.detail;
    expect(detail("measurable-results")).toMatch(/^3 of your 6 achievement lines include a number/);
    expect(detail("words-to-avoid")).toBe('Found "responsible for", "helped with", "team player". Recruiters skim past these.');
    expect(detail("job-level-match")).toBe("Your dates add up to about 6.5 years of experience; the posting asks for 3+ years.");
  });

  it("scores 53% and points at the job title as the biggest gap", () => {
    const r = report();
    expect(r.predictedSkills.map((p) => [p.term, p.status])).toEqual([
      ["Marketing automation", "missing"],
      ["Lead generation", "missing"],
      ["Canva", "found"],
    ]);
    expect(r.matchRate).toBe(53);
    expect(r.verdict).toEqual({
      target: 75,
      reached: false,
      message: "22 points below the 75% target. Start with missing high-importance skills you actually have. Your biggest gap is job title.",
    });
  });
});
