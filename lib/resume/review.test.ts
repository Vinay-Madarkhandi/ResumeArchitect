import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { diffUnits } from "@/lib/resume/diff";
import { buildRedline, matchChange } from "@/lib/resume/review";
import { toUnits } from "@/lib/resume/units";

const before = toUnits(markdownToDocument("# Ada\n\n## Experience\n\n- Wrote docs\n- Built tools\n- Fixed bugs\n\n## Skills\n\nGo"));
const after = toUnits(
  markdownToDocument("# Ada\n\n## Experience\n\n- Wrote onboarding docs\n- Fixed bugs\n- Shipped a CLI used by 40 teams\n\n## Skills\n\nGo"),
);

describe("buildRedline", () => {
  it("lists every current line once and every removed line once, in order", () => {
    const hunks = diffUnits(before, after);
    const items = buildRedline(after, hunks);
    const shown = items.flatMap((i) => (i.type === "equal" ? [i.unit.text] : [...i.hunk.before, ...i.hunk.after].map((u) => u.text)));
    expect(shown).toEqual([
      "Ada",
      "Experience",
      "Wrote docs",
      "Wrote onboarding docs",
      "Built tools",
      "Fixed bugs",
      "Shipped a CLI used by 40 teams",
      "Skills",
      "Go",
    ]);
  });
});

describe("matchChange", () => {
  it("links a hunk to the AI change that produced it", () => {
    const hunks = diffUnits(before, after);
    const change = {
      id: "c1",
      op: "rewrite" as const,
      before: "Wrote docs",
      after: "Wrote onboarding docs",
      reason: "Shows onboarding focus.",
      requirementIds: [],
      flags: [],
    };
    const modified = hunks.find((h) => h.kind === "modified")!;
    expect(matchChange(modified, [change])?.id).toBe("c1");
    expect(matchChange(hunks.find((h) => h.kind === "added")!, [change])).toBeNull();
  });
});
