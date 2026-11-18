import { describe, expect, it } from "vitest";
import { AiError, toGeminiSchema, type JsonModel, type JsonRequest } from "@/lib/gemini/model";
import { JobFactsSchema } from "@/lib/schemas/jobFacts";
import { extractJobFacts } from "./extractJobFacts";

function fakeModel(replies: unknown[]): JsonModel & { calls: JsonRequest[] } {
  const calls: JsonRequest[] = [];
  return {
    name: "fake",
    calls,
    async generate(req) {
      calls.push(req);
      const next = replies.shift();
      return typeof next === "string" ? next : JSON.stringify(next);
    },
  };
}

const POSTING = `Senior Backend Engineer
Required: 5+ years building services in Go and PostgreSQL. Kubernetes experience.
Nice to have: JavaScript. Strong communication.`;

const REPLY = {
  title: "Senior Backend Engineer",
  level: "senior",
  hardSkills: [
    { term: "Go", importance: "high" },
    { term: "PostgreSQL", importance: "high" },
    { term: "Kubernetes", importance: "medium" },
    { term: "K8s", importance: "high" },
    { term: "JavaScript", importance: "low" },
  ],
  softSkills: [
    { term: "communication", importance: "medium" },
    { term: "Kubernetes", importance: "low" },
  ],
  education: null,
  yearsRequired: 5,
  predictedSkills: [
    { term: "Docker", reason: "Kubernetes teams ship containers." },
    { term: "Postgres", reason: "Already named, as PostgreSQL." },
    { term: "Go", reason: "Already named." },
    { term: "gRPC", reason: "Common for Go service-to-service calls." },
  ],
};

describe("extractJobFacts", () => {
  it("sends the posting and returns schema-valid facts", async () => {
    const model = fakeModel([REPLY]);
    const facts = await extractJobFacts(model, POSTING);
    expect(model.calls[0].label).toBe("extractJobFacts");
    expect(model.calls[0].prompt).toContain("Kubernetes experience");
    expect(JobFactsSchema.parse(facts)).toEqual(facts);
    expect(facts).toMatchObject({ title: "Senior Backend Engineer", level: "senior", yearsRequired: 5, education: null });
  });

  it("keeps one entry per skill across synonyms, at its highest importance", async () => {
    const facts = await extractJobFacts(fakeModel([REPLY]), POSTING);
    expect(facts.hardSkills).toEqual([
      { term: "Go", importance: "high" },
      { term: "PostgreSQL", importance: "high" },
      { term: "Kubernetes", importance: "high" },
      { term: "JavaScript", importance: "low" },
    ]);
  });

  it("drops soft skills that repeat a hard skill", async () => {
    const facts = await extractJobFacts(fakeModel([REPLY]), POSTING);
    expect(facts.softSkills).toEqual([{ term: "communication", importance: "medium" }]);
  });

  it("drops predicted skills the posting already names in any spelling", async () => {
    const facts = await extractJobFacts(fakeModel([REPLY]), POSTING);
    expect(facts.predictedSkills.map((p) => p.term)).toEqual(["Docker", "gRPC"]);
  });

  it("fills defaults when Gemini returns nulls for optional facts", async () => {
    const facts = await extractJobFacts(
      fakeModel([{ ...REPLY, softSkills: null, predictedSkills: null, yearsRequired: null }]),
      POSTING,
    );
    expect(facts).toMatchObject({ softSkills: [], predictedSkills: [], yearsRequired: null });
  });

  it("rejects a reply with no hard skills or an unknown level", async () => {
    const bad = fakeModel([{ ...REPLY, hardSkills: [] }, { ...REPLY, level: "guru" }]);
    await expect(extractJobFacts(bad, POSTING)).rejects.toMatchObject({ code: "schema_validation_failed" });
    expect(bad.calls).toHaveLength(2);
  });

  it("rejects text that is not JSON", async () => {
    await expect(extractJobFacts(fakeModel(["nope", "still nope"]), POSTING)).rejects.toBeInstanceOf(AiError);
  });

  it("gives Gemini a schema without keywords its structured output rejects", () => {
    const schema = JSON.stringify(toGeminiSchema(JobFactsSchema));
    expect(schema).not.toMatch(/"(\$schema|additionalProperties|default)"/);
    expect(schema).toContain('"enum":["entry","mid","senior","executive"]');
  });
});
