import { describe, expect, it } from "vitest";
import { markdownToDocument, documentToMarkdown } from "@/lib/documentMarkdown";
import { geminiModel } from "@/lib/gemini/model";
import { analyzeJob } from "@/lib/gemini/prompts/analyzeJob";
import { tailorLines } from "@/lib/gemini/prompts/tailorLines";
import { parseResume } from "@/lib/gemini/prompts/parseResume";
import { editSelection } from "@/lib/gemini/prompts/editSelection";
import { writeCoverLetter } from "@/lib/gemini/prompts/coverLetter";
import { legacyJobFacts } from "@/lib/report/legacyJobFacts";
import { buildMatchReport } from "@/lib/report/matchReport";
import { toUnits } from "@/lib/resume/units";
import { applyEdits } from "@/lib/tailoring/applyEdits";

/**
 * Live smoke test against the real Gemini API. Skipped unless GEMINI_API_KEY
 * is set:  GEMINI_API_KEY=... npm run smoke:gemini
 * Proves the model name, the structured-output schemas, and every prompt work
 * end to end. Uses a few thousand tokens of your quota.
 */
const key = process.env.GEMINI_API_KEY;

const RESUME = `# Ada Lovelace

ada@example.com · +44 20 7946 0958 · London

## Summary

Backend engineer who builds dependable systems and enjoys teaching.

## Experience

### Senior Engineer — Analytical Engines Ltd

2020 – Present

- Worked on services in Go backed by PostgreSQL
- Built a Kafka pipeline that cut invoice latency by 38%
- Ran the on-call rotation and incident reviews

## Skills

Go, PostgreSQL, Kafka, Docker`;

const JOB = `Senior Backend Engineer at Northwind Payments. You'll own the payments platform end to end.
Requirements: 5+ years with Go, PostgreSQL, event streaming with Kafka, and incident response.
Nice to have: Kubernetes, mentoring. We care about reliability and latency.`;

describe.skipIf(!key)("Gemini live smoke test", () => {
  const model = geminiModel(key ?? "");
  const doc = markdownToDocument(RESUME);

  it("runs the job analysis, tailoring, cover letter, edit, and parse prompts", async () => {
    const job = await analyzeJob(model, JOB);
    expect(job.requirements.length).toBeGreaterThan(2);

    const units = toUnits(doc);
    const report = buildMatchReport({ job: legacyJobFacts(job), jobText: JOB, resume: doc, file: null, asOf: new Date() });
    const tailored = await tailorLines(model, { units, job, report });
    const applied = applyEdits(units, tailored.edits);
    expect(applied.changes.length).toBeGreaterThan(0);

    const letter = await writeCoverLetter(model, { resumeMarkdown: documentToMarkdown(doc), job, jobText: JOB, tone: "concise" });
    expect(letter).toMatch(/Ada/);

    const edit = await editSelection(model, {
      contextBefore: "",
      selectedText: "Worked on services in Go backed by PostgreSQL",
      contextAfter: "",
      instruction: "Lead with a strong verb",
    });
    expect(edit.replacementText.length).toBeGreaterThan(10);

    const parsed = await parseResume(model, RESUME.replace(/[#*-]/g, ""));
    expect(parsed.markdown).toContain("Ada Lovelace");

    console.log("token usage by step:", JSON.stringify(model.usage));
  }, 180_000);
});
