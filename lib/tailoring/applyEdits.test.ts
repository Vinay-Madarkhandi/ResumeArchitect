import { describe, expect, it } from "vitest";
import type { DocumentContent } from "@/lib/schemas/document";
import { applyEdits } from "@/lib/tailoring/applyEdits";
import { numberedResume } from "@/lib/gemini/prompts/tailorLines";
import { fromUnits, toUnits } from "@/lib/resume/units";

const nested: DocumentContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Experience" }] },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Platform lead" }] },
            {
              type: "bulletList",
              content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Owned billing" }] }] }],
            },
          ],
        },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Wrote docs" }] }] },
      ],
    },
  ],
};

describe("applyEdits with nested bullets", () => {
  it("marks bullets with sub-bullets as locked and never flattens them", () => {
    const units = toUnits(nested);
    expect(numberedResume(units)).toContain("[2] (bullet, locked)");
    const { units: out, changes } = applyEdits(units, [
      { op: "rewrite", line: 2, text: "Led the platform team", reason: "r", requirementIds: [], cites: [] },
      { op: "rewrite", line: 3, text: "Wrote onboarding docs", reason: "r", requirementIds: [], cites: [] },
    ]);
    expect(changes.map((c) => c.after)).toEqual(["Wrote onboarding docs"]);
    expect(fromUnits(out).content[1]).toMatchObject({ content: [nested.content[1].type === "bulletList" ? nested.content[1].content[0] : null, expect.anything()] });
  });
});
