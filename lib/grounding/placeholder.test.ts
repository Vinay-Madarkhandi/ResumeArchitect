import { describe, expect, it } from "vitest";
import {
  hasUnverifiedClaim,
  stripUnverifiedClaims,
  stripClaimsFromDocument,
  VERIFY_CLAIM,
} from "./placeholder";
import type { DocumentContent } from "@/lib/schemas/document";

describe("placeholder utilities", () => {
  it("detects unverified claims in various formats", () => {
    expect(hasUnverifiedClaim("Worked on services [Verify claim]")).toBe(true);
    expect(hasUnverifiedClaim("Worked on services [Verify claim 2]")).toBe(true);
    expect(hasUnverifiedClaim("Worked on services [verify claim]")).toBe(true);
    expect(hasUnverifiedClaim("Worked on services")).toBe(false);
  });

  it("strips unverified claims from strings cleanly", () => {
    expect(stripUnverifiedClaims("Worked on services [Verify claim]")).toBe("Worked on services");
    expect(stripUnverifiedClaims("Worked on services [Verify claim 3] successfully")).toBe("Worked on services successfully");
    expect(stripUnverifiedClaims("[Verify claim] Started new role")).toBe("Started new role");
    expect(stripUnverifiedClaims("No placeholders here")).toBe("No placeholders here");
  });

  it("strips unverified claims recursively from DocumentContent trees", () => {
    const doc: DocumentContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Jane Doe" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Senior Software Engineer " },
            { type: "text", text: "[Verify claim 1]" },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Scaled API throughput by 50% " },
                    { type: "text", text: "[Verify claim]" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const stripped = stripClaimsFromDocument(doc);
    expect(hasUnverifiedClaim(JSON.stringify(stripped))).toBe(false);

    const para = stripped.content[1] as any;
    expect(para.content).toHaveLength(1);
    expect(para.content[0].text).toBe("Senior Software Engineer ");

    const bulletPara = (stripped.content[2] as any).content[0].content[0];
    expect(bulletPara.content).toHaveLength(1);
    expect(bulletPara.content[0].text).toBe("Scaled API throughput by 50% ");
  });
});
