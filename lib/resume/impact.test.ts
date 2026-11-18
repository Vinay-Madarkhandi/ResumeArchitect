import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { buildMatchReport } from "@/lib/report/matchReport";
import { legacyJobFacts } from "@/lib/report/legacyJobFacts";
import { diffUnits } from "@/lib/resume/diff";
import { changeImpact } from "@/lib/resume/impact";
import { toUnits } from "@/lib/resume/units";

const job: JobAnalysis = {
  title: "Platform Engineer",
  company: null,
  seniority: null,
  summary: "x",
  requirements: [
    { id: "k8s", label: "Kubernetes", aliases: [], importance: "must", category: "tool" },
    { id: "go", label: "Go", aliases: [], importance: "must", category: "skill" },
  ],
  keywords: [{ term: "reliability", aliases: [] }],
};

const target = {
  job: legacyJobFacts(job),
  jobText: "Platform Engineer for Go services, Kubernetes and reliability.",
  file: null,
  asOf: new Date("2026-11-18"),
};

const base = "# Ada\n\nada@example.com +1 415 555 0100\n\n## Experience\n\n- Built services in Go\n- Wrote docs\n\n## Skills\n\nGo";

describe("changeImpact", () => {
  it("credits the change with the points and requirement it adds", () => {
    const before = toUnits(markdownToDocument(base));
    const afterDoc = markdownToDocument(base.replace("- Wrote docs", "- Ran Kubernetes clusters for reliability"));
    const after = toUnits(afterDoc);
    // Too different to pair with "Wrote docs", so it diffs as a removal plus an addition.
    const hunk = diffUnits(before, after).find((h) => h.kind === "added")!;
    const impact = changeImpact(after, hunk, target, buildMatchReport({ ...target, resume: afterDoc }));
    expect(impact.points).toBeGreaterThan(0);
    expect(impact.gained.sort()).toEqual(["Kubernetes", "reliability"]);
    expect(impact.lost).toEqual([]);
  });

  it("reports zero for a change that doesn't move the score", () => {
    const before = toUnits(markdownToDocument(base));
    const afterDoc = markdownToDocument(base.replace("- Wrote docs", "- Wrote onboarding docs"));
    const after = toUnits(afterDoc);
    const [hunk] = diffUnits(before, after);
    expect(changeImpact(after, hunk, target, buildMatchReport({ ...target, resume: afterDoc })).points).toBe(0);
  });
});
