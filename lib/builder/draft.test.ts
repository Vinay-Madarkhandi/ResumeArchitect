import { describe, expect, it } from "vitest";
import { documentText, toUnits } from "@/lib/resume/units";
import { draftProblems, draftToDocument, emptyDraft, type Draft } from "@/lib/builder/draft";

const draft: Draft = {
  ...emptyDraft(),
  name: "Ada Lovelace",
  email: "ada@example.com",
  location: "London",
  links: ["linkedin.com/in/ada"],
  targetRole: "Backend Engineer",
  summary: "Backend engineer who builds dependable payment systems.",
  experience: [
    { id: "1", title: "Senior Engineer", company: "Analytical Engines", location: "London", start: "2020", end: "Present", notes: "", bullets: ["Built a Kafka pipeline", "  ", "Ran on-call"] },
    { id: "2", title: "", company: "", location: "", start: "", end: "", notes: "", bullets: [] },
  ],
  education: [{ id: "3", degree: "BSc Mathematics", school: "University of London", location: "", start: "", end: "2016", details: "" }],
  skills: "Go, PostgreSQL,\nKafka",
  certifications: [{ id: "4", name: "AWS Solutions Architect", issuer: "Amazon", year: "2022" }],
};

describe("draftToDocument", () => {
  it("sets the draft as a standard one-column resume", () => {
    expect(documentText(draftToDocument(draft)).split("\n")).toEqual([
      "Ada Lovelace",
      "ada@example.com · London · linkedin.com/in/ada",
      "Summary",
      "Backend engineer who builds dependable payment systems.",
      "Experience",
      "Senior Engineer — Analytical Engines",
      "London · 2020 – Present",
      "Built a Kafka pipeline",
      "Ran on-call",
      "Education",
      "BSc Mathematics — University of London",
      "2016",
      "Skills",
      "Go, PostgreSQL, Kafka",
      "Certifications",
      "AWS Solutions Architect — Amazon, 2022",
    ]);
  });

  it("uses name, section and role headings the rest of the app understands", () => {
    const units = toUnits(draftToDocument(draft));
    expect(units.filter((u) => u.kind === "heading").map((u) => [u.level, u.text])).toEqual([
      [1, "Ada Lovelace"], [2, "Summary"], [2, "Experience"], [3, "Senior Engineer — Analytical Engines"],
      [2, "Education"], [3, "BSc Mathematics — University of London"], [2, "Skills"], [2, "Certifications"],
    ]);
    expect(JSON.stringify(draftToDocument(draft))).toContain('"href":"https://linkedin.com/in/ada"');
  });

  it("asks for a name, a way to reach you, and real figures before finishing", () => {
    expect(draftProblems(emptyDraft())).toHaveLength(2);
    expect(draftProblems(draft)).toEqual([]);
    const withPlaceholder = { ...draft, experience: [{ ...draft.experience[0], bullets: ["Cut latency by [X%]"] }] };
    expect(draftProblems(withPlaceholder)).toEqual(["Replace or delete the placeholder like [X%] with your real figures."]);
  });
});
