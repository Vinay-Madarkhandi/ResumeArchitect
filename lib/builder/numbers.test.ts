import { describe, expect, it } from "vitest";
import { guardNumbers } from "@/lib/builder/numbers";
import { draftPlaceholders, emptyDraft } from "@/lib/builder/draft";

describe("guardNumbers", () => {
  const source = "Ran payments at Northwind from 2019. Cut costs 30% and handled 2,000 merchants on $4M budget.";

  it("keeps figures the user wrote", () => {
    expect(guardNumbers("Cut infrastructure costs by 30% across 2,000 merchants since 2019", source))
      .toBe("Cut infrastructure costs by 30% across 2,000 merchants since 2019");
    expect(guardNumbers("Managed a $4M budget", source)).toBe("Managed a $4M budget");
  });

  it("turns invented figures into placeholders the user must fill", () => {
    expect(guardNumbers("Raised conversion by 40% for 12 teams, saving $250k and shipping 3x faster", source))
      .toBe("Raised conversion by [X%] for [N] teams, saving [$X] and shipping [N]x faster");
    expect(guardNumbers("Led 12, then 15 people.", source)).toBe("Led [N], then [N] people.");
  });

  it("leaves digits inside names alone", () => {
    expect(guardNumbers("Moved storage to S3 and ran K8s with OAuth2", "")).toBe("Moved storage to S3 and ran K8s with OAuth2");
  });

  it("finds every placeholder left in a draft", () => {
    const draft = { ...emptyDraft(), summary: "Engineer with [N] years", experience: [{ id: "a", title: "Engineer", company: "Acme", location: "", start: "", end: "", notes: "", bullets: ["Cut latency by [X%]"] }] };
    expect(draftPlaceholders(draft)).toEqual([
      { where: "Summary", placeholder: "[N]" },
      { where: "Engineer", placeholder: "[X%]" },
    ]);
  });
});
