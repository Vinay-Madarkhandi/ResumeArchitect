import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { scoreResume, termPattern } from "@/lib/scoring/score";

const job: JobAnalysis = {
  title: "Senior Backend Engineer",
  company: "Northwind",
  seniority: "Senior",
  summary: "Own payment services.",
  requirements: [
    { id: "go", label: "Go", aliases: ["Golang"], importance: "must", category: "skill" },
    { id: "pg", label: "PostgreSQL", aliases: ["Postgres"], importance: "must", category: "tool" },
    { id: "k8s", label: "Kubernetes", aliases: ["k8s"], importance: "nice", category: "tool" },
  ],
  keywords: [{ term: "payments", aliases: ["payment"] }, { term: "CI/CD", aliases: [] }],
};

const resume = (body: string) =>
  markdownToDocument(`# Ada Lovelace\n\nada@example.com · +1 415 555 0100\n\n## Experience\n\n${body}\n\n## Skills\n\nGo, Python`);

describe("termPattern", () => {
  it("matches whole tokens only", () => {
    expect(termPattern("Go").test("Built services in Go.")).toBe(true);
    expect(termPattern("Go").test("Good communicator")).toBe(false);
    expect(termPattern("C++").test("Wrote C++ and Rust")).toBe(true);
    expect(termPattern("CI/CD").test("owned the CI CD pipeline")).toBe(true);
  });
});

describe("scoreResume", () => {
  it("credits aliases and records the evidence line", () => {
    const report = scoreResume(resume("- Scaled Postgres for payment flows by 40%"), job);
    const pg = report.requirements.find((r) => r.id === "pg")!;
    expect(pg.matched).toBe(true);
    expect(pg.evidence).toContain("Postgres");
  });

  it("scores a tailored resume higher than its source", () => {
    const before = scoreResume(resume("- Built internal tools"), job);
    const after = scoreResume(
      resume("- Built payment services in Go on PostgreSQL, deployed via CI/CD to Kubernetes, cutting latency 35%"),
      job,
    );
    expect(after.total).toBeGreaterThan(before.total);
  });

  it("sums component points to the total and redistributes empty components", () => {
    const noNice = { ...job, requirements: job.requirements.filter((r) => r.importance === "must"), keywords: [] };
    const report = scoreResume(resume("- Go and PostgreSQL services handling 2M requests a day"), noNice);
    const weights = report.components.reduce((s, c) => s + c.weight, 0);
    expect(weights).toBeCloseTo(1, 6);
    expect(report.components.map((c) => c.id)).toEqual(["must", "ats"]);
    expect(report.total).toBeLessThanOrEqual(100);
  });
});
