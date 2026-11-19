import { describe, expect, it } from "vitest";
import type { JsonModel, JsonRequest } from "@/lib/gemini/model";
import { NORTHWIND } from "@/lib/career/fixtures";
import { LinkedInProfileSchema } from "@/lib/schemas/career";
import { analyzeRole } from "./analyzeRole";
import { writeInterviewQuestions } from "./interviewQuestions";
import { suggestLinkedIn } from "./linkedinProfile";
import { rateAnswer } from "./rateAnswer";

function fakeModel(replies: unknown[]): JsonModel & { calls: JsonRequest[] } {
  const calls: JsonRequest[] = [];
  return {
    name: "fake",
    calls,
    async generate(req) {
      calls.push(req);
      return JSON.stringify(replies.shift());
    },
  };
}

const RESUME = "# Ada Lovelace\n\n## Experience\n\n- Built a Kafka pipeline that cut invoice latency by 38%\n- Wrote payment services in Go on PostgreSQL";
const profile = LinkedInProfileSchema.parse({ headline: "Engineer at Analytical Engines" });

describe("suggestLinkedIn", () => {
  it("flags numbers, names and skills the resume can't back up", async () => {
    const model = fakeModel([{
      headlines: ["Built a Kafka pipeline that cut invoice latency by 38%", "Backend Engineer | Kubernetes at Globex Corp | 5M users"],
      about: "I wrote payment services in Go on Postgres.",
      notes: ["List Apache Pulsar in your Skills section."],
    }]);
    const result = await suggestLinkedIn(model, { profile, resumeMarkdown: RESUME, job: NORTHWIND });
    expect(result.headlines[0].flags).toEqual([]);
    expect(result.headlines[1].flags.map((f) => [f.kind, f.value])).toEqual(expect.arrayContaining([
      ["number", "5M"], ["name", "Globex Corp"], ["skill", "Kubernetes"],
    ]));
    expect(result.headlines[1].text).not.toContain("Kubernetes");
    expect(result.about.flags).toEqual([]);
    expect(result.notes[0]).toMatchObject({ text: "[Verify claim].", flags: expect.arrayContaining([
      expect.objectContaining({ value: "Apache Pulsar" }),
    ]) });
    expect(model.calls[0].prompt).toContain("Kafka (must-have)");
    expect(model.calls[0].system).toContain("Never invent");
  });

  it("asks again when a headline is longer than LinkedIn allows", async () => {
    const model = fakeModel([
      { headlines: ["x".repeat(221)], about: "About." },
      { headlines: ["Backend Engineer"], about: "About." },
    ]);
    const result = await suggestLinkedIn(model, { profile, resumeMarkdown: RESUME, job: null });
    expect(model.calls).toHaveLength(2);
    expect(result.headlines.map((h) => h.text)).toEqual(["[Verify claim]"]);
    expect(model.calls[0].prompt).toContain("None given");
  });
});

describe("interview prompts", () => {
  it("retries question sets with missing categories and keeps ids unique", async () => {
    const q = { id: "outage", category: "behavioral", question: "Tell me about an outage.", assessing: "Ownership.", requirement: null };
    const model = fakeModel([
      { questions: [q, q, q] },
      { questions: [q, { ...q, category: "technical" }, { ...q, category: "role", id: "" }] },
    ]);
    const questions = await writeInterviewQuestions(model, {
      job: NORTHWIND, jobText: null, resumeMarkdown: RESUME,
    });
    expect(model.calls).toHaveLength(2);
    expect(questions.map((x) => x.id)).toEqual(["outage", "outage-1", "q-2"]);
  });

  it("filters invented praise and validates STAR evidence against the answer", async () => {
    const rating = { star: { situation: true, task: true, action: true, result: false }, specificity: 4, relevance: 3, strengths: ["The 38% reduction makes the result measurable.", "I measured throughput."], improvements: ["Explain how you measured invoice latency."], starEvidence: { action: "I measured throughput.", situation: "When invoice processing slowed" } };
    const question = { id: "q", category: "technical" as const, question: "How do you size Kafka partitions?", assessing: "Depth.", requirement: "Kafka" };
    const model = fakeModel([rating]);
    await expect(rateAnswer(model, { job: NORTHWIND, question, answer: "  I measured throughput.  ", resumeMarkdown: RESUME })).resolves.toEqual({
      star: { situation: false, task: false, action: true, result: false },
      specificity: 4, relevance: 3, strengths: ["“I measured throughput.”"],
      improvements: ["State the outcome of your actions.", "Include a measurable result if you have a figure you can verify."],
    });
    expect(model.calls[0].prompt).toContain("# Their answer\nI measured throughput.");
  });

  it("never attributes a role analysis to a company", async () => {
    const job = await analyzeRole(fakeModel([{ ...NORTHWIND }]), "Backend engineer");
    expect(job.company).toBeNull();
  });
});
