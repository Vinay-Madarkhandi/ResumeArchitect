import { describe, expect, it } from "vitest";
import { draftPlaceholders, emptyDraft } from "@/lib/builder/draft";

describe("builder placeholders", () => {
  it("finds every placeholder left in a draft", () => {
    const draft = { ...emptyDraft(), summary: "Engineer with [N] years", experience: [{ id: "a", title: "Engineer", company: "Acme", location: "", start: "", end: "", notes: "", bullets: ["Cut latency by [X%]"] }] };
    expect(draftPlaceholders(draft)).toEqual([
      { where: "Summary", placeholder: "[N]" },
      { where: "Engineer", placeholder: "[X%]" },
    ]);
  });
});
