import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { highlightJob } from "@/lib/scoring/highlightJob";
import { requirementEvidence } from "@/lib/tailoring/requirements";
import { toUnits } from "@/lib/resume/units";

const job: JobAnalysis = {
  title: "x",
  company: null,
  seniority: null,
  summary: "x",
  requirements: [
    { id: "pg", label: "PostgreSQL", aliases: ["Postgres"], importance: "must", category: "tool" },
    { id: "k8s", label: "Kubernetes", aliases: [], importance: "nice", category: "tool" },
  ],
  keywords: [{ term: "payments", aliases: [] }],
};

describe("highlightJob", () => {
  it("marks requirements and keywords with whether the resume shows them, keeping all text", () => {
    const text = "You will own payments on Postgres. Kubernetes is a plus.";
    const report = requirementEvidence(toUnits(markdownToDocument("# A\n\n- Scaled PostgreSQL")), job);
    const segs = highlightJob(text, job, report);
    expect(segs.map((s) => s.text).join("")).toBe(text);
    const terms = segs.filter((s) => s.term).map((s) => [s.text, s.term!.kind, s.term!.matched]);
    expect(terms).toEqual([
      ["payments", "keyword", false],
      ["Postgres", "must", true],
      ["Kubernetes", "nice", false],
    ]);
  });
});
