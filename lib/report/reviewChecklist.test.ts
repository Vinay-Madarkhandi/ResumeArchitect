import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JobPostPanel } from "@/components/workspace/JobPostPanel";
import { ScorePanel } from "@/components/workspace/ScorePanel";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JobFacts } from "@/lib/schemas/jobFacts";
import { highlightPosting } from "./keywords";
import { buildMatchReport } from "./matchReport";

/** The tailoring review's checklist and job-post highlights, read off the same report that produces the score. */

const JOB_TEXT = "Backend Engineer. Required: Go services and PostgreSQL. Kafka experience. Mentoring is a plus.";
const FACTS: JobFacts = {
  title: "Backend Engineer",
  level: "mid",
  hardSkills: [{ term: "Go", importance: "high" }, { term: "PostgreSQL", importance: "high" }, { term: "Kafka", importance: "medium" }],
  softSkills: [{ term: "mentoring", importance: "low" }],
  otherKeywords: [],
  education: null,
  yearsRequired: null,
  predictedSkills: [],
};
// "Postgres" is PostgreSQL by synonym; "go-to-market" is not the Go language.
const RESUME = markdownToDocument("# Ada Lovelace\n\nada@example.com\n\n## Experience\n\n- Built Postgres pipelines\n- Led a go-to-market launch");
const report = buildMatchReport({ job: FACTS, jobText: JOB_TEXT, resume: RESUME, file: null, asOf: new Date("2026-11-18") });

describe("tailoring review checklist", () => {
  it("shows exactly the skills the score gives credit for", () => {
    const html = renderToStaticMarkup(createElement(ScorePanel, { before: report, now: report, onAddSkill: () => {} }));
    const shown = [...html.matchAll(/data-skill="([^"]+)" data-shown="true"/g)].map((m) => m[1]);
    const notShown = [...html.matchAll(/data-skill="([^"]+)" data-shown="false"/g)].map((m) => m[1]);
    const credited = [...report.hardSkills, ...report.softSkills].filter((s) => s.status !== "missing").map((s) => s.term);

    expect(shown).toEqual(credited);
    expect(shown).toEqual(["PostgreSQL"]);
    expect(notShown.sort()).toEqual(["Go", "Kafka", "mentoring"]);
    expect(report.breakdown.find((c) => c.id === "hardSkills")!.ratio).toBeGreaterThan(0);
  });

  it("highlights the posting with the same matches", () => {
    const marked = highlightPosting(JOB_TEXT, [...report.hardSkills, ...report.softSkills])
      .flatMap((segment) => (segment.skill ? [[segment.text, segment.skill.status !== "missing"]] : []));
    expect(marked).toEqual([["Go", false], ["PostgreSQL", true], ["Kafka", false], ["Mentoring", false]]);

    const html = renderToStaticMarkup(createElement(JobPostPanel, { text: JOB_TEXT, summary: "Payments backend.", report }));
    expect(html).toContain("Not shown in your resume");
    expect(html).not.toMatch(/border-dashed[^>]*>PostgreSQL/);
  });
});
