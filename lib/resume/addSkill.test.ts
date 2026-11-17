import { describe, expect, it } from "vitest";
import { documentToMarkdown, markdownToDocument } from "@/lib/documentMarkdown";
import { addSkill } from "@/lib/resume/addSkill";

describe("addSkill", () => {
  it("appends to the last line of the Skills section", () => {
    const doc = markdownToDocument("# Ada\n\n## Skills\n\n**Languages:** Go, Python\n\n**Tools:** Docker\n\n## Education\n\nBSc");
    expect(documentToMarkdown(addSkill(doc, "Kubernetes"))).toContain("**Tools:** Docker, Kubernetes\n\n## Education");
  });

  it("creates a Skills section when there is none", () => {
    const doc = markdownToDocument("# Ada\n\n## Experience\n\n- Built things");
    expect(documentToMarkdown(addSkill(doc, "Go"))).toMatch(/## Skills\n\nGo$/);
  });
});
