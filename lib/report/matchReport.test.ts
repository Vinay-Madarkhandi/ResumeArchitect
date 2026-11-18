import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JobFacts } from "@/lib/schemas/jobFacts";
import { buildMatchReport, TARGET_MATCH_RATE, WEIGHTS } from "./matchReport";
import type { ReportInput } from "./report";

const JOB: JobFacts = {
  title: "Backend Engineer",
  level: "mid",
  hardSkills: [
    { term: "Go", importance: "high" },
    { term: "PostgreSQL", importance: "high" },
    { term: "Kubernetes", importance: "medium" },
    { term: "Terraform", importance: "low" },
  ],
  softSkills: [{ term: "communication", importance: "medium" }],
  education: null,
  yearsRequired: null,
  predictedSkills: [{ term: "Docker", reason: "Kubernetes teams ship containers." }],
};

const JOB_TEXT = "Backend Engineer. Go, PostgreSQL, Kubernetes. Terraform a plus. Clear communication.";

function report(body: string, job: JobFacts = JOB, jobText = JOB_TEXT) {
  const input: ReportInput = {
    job,
    jobText,
    resume: markdownToDocument(`# Ada Lovelace\n\nada@example.com · +1 415 555 0100 · linkedin.com/in/ada\n\n${body}`),
    file: null,
    asOf: new Date(2026, 10, 18),
  };
  return buildMatchReport(input);
}

const STRONG = `## Summary

Backend Engineer building Go and PostgreSQL services on Kubernetes with Terraform and Docker. Clear communication with product teams.

## Experience

### Backend Engineer · Acme · Jan 2021 – Present

- Built Go services on PostgreSQL serving 2M requests a day
- Moved 40 services to Kubernetes with Terraform, cutting cost 30%
- Cut deploy time 50% with Docker build caching
- Led weekly communication with 3 product teams
- Shipped 12 releases with zero downtime

## Education

B.S. Computer Science · Aug 2016 – May 2020

## Skills

Go, PostgreSQL, Kubernetes, Terraform, Docker`;

describe("WEIGHTS", () => {
  it("sums to 100% with hard skills weighted most", () => {
    const values = Object.values(WEIGHTS);
    expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Math.max(...values)).toBe(WEIGHTS.hardSkills);
  });
});

describe("buildMatchReport", () => {
  it("returns every section of the report", () => {
    const r = report(STRONG);
    expect(Object.keys(r).sort()).toEqual(
      ["breakdown", "formatting", "hardSkills", "matchRate", "predictedSkills", "recruiterTips", "searchability", "softSkills", "verdict"].sort(),
    );
    expect(r.hardSkills.map((s) => s.status)).toEqual(["found", "found", "found", "found"]);
    expect(r.predictedSkills[0]).toMatchObject({ term: "Docker", status: "found" });
  });

  it("scores a strong resume past the target and says so", () => {
    const r = report(STRONG);
    expect(r.matchRate).toBeGreaterThanOrEqual(TARGET_MATCH_RATE);
    expect(r.verdict).toMatchObject({ target: 75, reached: true });
  });

  it("scores a weak resume low and names its biggest gap", () => {
    const r = report("## Experience\n\n### Barista · 2019 – 2021\n\n- Made coffee");
    expect(r.matchRate).toBeLessThan(50);
    expect(r.verdict.reached).toBe(false);
    expect(r.verdict.message).toMatch(/biggest gap is hard skills/);
  });

  it("explains every point: component points add up to the match rate", () => {
    const r = report(STRONG.replace(/Terraform/g, "Ansible"));
    expect(r.breakdown.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 10);
    expect(r.breakdown.reduce((s, c) => s + c.points, 0)).toBeCloseTo(r.matchRate, 0);
  });

  it("hands an empty part's weight to the rest", () => {
    const r = report(STRONG, { ...JOB, softSkills: [], predictedSkills: [] });
    expect(r.breakdown.map((c) => c.id)).toEqual(["hardSkills", "jobTitle", "searchability", "formatting", "recruiterTips"]);
    expect(r.breakdown.find((c) => c.id === "hardSkills")!.weight).toBeCloseTo(0.45 / 0.8, 10);
  });

  it("redistributes every unmeasurable skill component for a sparse posting", () => {
    const r = report("## Experience\n\n### Office Assistant", {
      ...JOB, title: "Office Assistant", hardSkills: [], softSkills: [], predictedSkills: [],
    }, "Office Assistant. Full-time. Apply by Friday.");
    expect(r.breakdown.map((c) => c.id)).toEqual(["jobTitle", "searchability", "formatting", "recruiterTips"]);
    expect(r.breakdown.reduce((sum, c) => sum + c.weight, 0)).toBeCloseTo(1);
    expect(Number.isInteger(r.matchRate)).toBe(true);
    expect(r.matchRate).toBeGreaterThanOrEqual(0);
    expect(r.matchRate).toBeLessThanOrEqual(100);
  });

  it("ranks exact over synonym over missing, and a missing must-have over a missing nice-to-have", () => {
    const hard = (body: string) => report(body).breakdown.find((c) => c.id === "hardSkills")!.ratio;
    const exact = hard("Go, PostgreSQL, Kubernetes, Terraform");
    const synonym = hard("Go, Postgres, Kubernetes, Terraform");
    const missing = hard("Go, Kubernetes, Terraform");
    expect(exact).toBe(1);
    expect(synonym).toBeLessThan(exact);
    expect(synonym).toBeGreaterThan(missing);
    expect(hard("Go, PostgreSQL, Kubernetes")).toBeGreaterThan(hard("Go, Kubernetes, Terraform"));
  });

  it("gives one mention of a skill the posting repeats partial credit", () => {
    const repeated = "Go programming, Go services, Go APIs. PostgreSQL. Kubernetes. Terraform.";
    const once = report("Go, PostgreSQL, Kubernetes, Terraform", JOB, repeated).breakdown[0].ratio;
    const twice = report("Go, Go, PostgreSQL, Kubernetes, Terraform", JOB, repeated).breakdown[0].ratio;
    expect(once).toBeLessThan(1);
    expect(twice).toBe(1);
  });

  it("deduplicates stored facts before scoring, including case and synonym variants", () => {
    const job = { ...JOB, predictedSkills: [{ term: "Microsoft Excel", reason: "Useful for reporting." }] };
    const expected = report(STRONG.replace(/Terraform/g, "Ansible"), job);
    const duplicate = report(STRONG.replace(/Terraform/g, "Ansible"), {
      ...job,
      hardSkills: [
        ...JOB.hardSkills,
        { term: "Postgres", importance: "low" },
        { term: "postgresql", importance: "high" },
        { term: "...", importance: "high" },
      ],
      softSkills: [...JOB.softSkills, { term: "Communication Skills", importance: "low" }],
      predictedSkills: [...job.predictedSkills, { term: "Excel", reason: "Duplicate." }],
    });
    expect(duplicate).toEqual(expected);
  });

  it("checks formatting section heading names separately from searchability", () => {
    const heading = report(STRONG.replace("## Experience", "## Where I've Been")).formatting
      .find((c) => c.id === "section-heading-names");
    expect(heading).toMatchObject({ status: "warn", fix: expect.stringContaining("Work Experience") });
  });

  it("is reproducible: the same input always gives the same report", () => {
    expect(report(STRONG)).toEqual(report(STRONG));
  });
});
