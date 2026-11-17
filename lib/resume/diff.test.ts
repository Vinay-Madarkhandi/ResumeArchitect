import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { diffUnits, diffWords, revertHunk } from "@/lib/resume/diff";
import { fromUnits, toUnits } from "@/lib/resume/units";

const doc = (md: string) => toUnits(markdownToDocument(md));

const BASE = `# Ada Lovelace

ada@example.com

## Experience

- Built data pipelines in Python
- Led a team of four engineers
- Wrote documentation

## Skills

Python, SQL`;

describe("diffWords", () => {
  it("marks inserted and deleted words while keeping the shared ones", () => {
    const ops = diffWords("Built data pipelines in Python", "Built streaming data pipelines in Python and Go");
    expect(ops.filter((o) => o.type === "insert").map((o) => o.text.trim())).toEqual(["streaming", "and Go"]);
    expect(ops.filter((o) => o.type === "delete")).toEqual([]);
    expect(ops.map((o) => (o.type === "delete" ? "" : o.text)).join("")).toBe(
      "Built streaming data pipelines in Python and Go",
    );
  });

  it("reconstructs both sides exactly", () => {
    const a = "Led a team of four engineers, shipping weekly.";
    const b = "Led a cross-functional team of six engineers shipping daily.";
    const ops = diffWords(a, b);
    expect(ops.filter((o) => o.type !== "insert").map((o) => o.text).join("")).toBe(a);
    expect(ops.filter((o) => o.type !== "delete").map((o) => o.text).join("")).toBe(b);
  });
});

describe("diffUnits", () => {
  it("returns no hunks for identical documents", () => {
    expect(diffUnits(doc(BASE), doc(BASE))).toEqual([]);
  });

  it("pairs a rewritten bullet as one modified hunk with a word redline", () => {
    const after = doc(BASE.replace("Built data pipelines in Python", "Built streaming data pipelines in Python and Kafka"));
    const hunks = diffUnits(doc(BASE), after);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].kind).toBe("modified");
    expect(hunks[0].words?.some((w) => w.type === "insert" && w.text.includes("streaming"))).toBe(true);
  });

  it("reports added and removed lines", () => {
    const after = doc(
      BASE.replace("- Wrote documentation", "- Cut cloud spend 30% by rightsizing clusters").replace("Python, SQL", "Python, SQL, Terraform"),
    );
    const kinds = diffUnits(doc(BASE), after).map((h) => h.kind);
    expect(kinds).toContain("modified");
    expect(kinds.filter((k) => k === "added").length + kinds.filter((k) => k === "removed").length).toBe(2);
  });

  it("gives the same id to the same change on recompute", () => {
    const after = doc(BASE.replace("Wrote documentation", "Wrote onboarding documentation"));
    expect(diffUnits(doc(BASE), after)[0].id).toBe(diffUnits(doc(BASE), after)[0].id);
  });
});

describe("revertHunk", () => {
  it("restores the original document when every hunk is reverted", () => {
    const before = doc(BASE);
    let after = doc(
      BASE.replace("- Led a team of four engineers\n", "")
        .replace("Built data pipelines in Python", "Built streaming pipelines in Python")
        .replace("## Skills", "## Technical Skills\n\nKubernetes certified\n\n## Skills"),
    );
    for (let guard = 0; guard < 10; guard++) {
      const hunks = diffUnits(before, after);
      if (hunks.length === 0) break;
      after = revertHunk(after, hunks[0])!;
    }
    expect(fromUnits(after)).toEqual(fromUnits(before));
  });

  it("reverts only the chosen change and keeps the others", () => {
    const before = doc(BASE);
    const after = doc(BASE.replace("Wrote documentation", "Wrote runbooks").replace("Python, SQL", "Python, SQL, dbt"));
    const hunks = diffUnits(before, after);
    expect(hunks).toHaveLength(2);
    const reverted = revertHunk(after, hunks[0])!;
    const remaining = diffUnits(before, reverted);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].after[0].text).toBe("Python, SQL, dbt");
  });
});

describe("units round-trip", () => {
  it("keeps list grouping and heading levels", () => {
    const original = markdownToDocument(BASE);
    expect(fromUnits(toUnits(original))).toEqual(original);
  });
});

describe("hunk identity and revert safety", () => {
  it("gives identical changes at different places distinct ids", () => {
    const before = doc("# A\n\n## X\n\nsame line\n\n## Y\n\nsame line");
    const after = doc("# A\n\n## X\n\n## Y");
    const hunks = diffUnits(before, after);
    expect(hunks).toHaveLength(2);
    expect(new Set(hunks.map((h) => h.id)).size).toBe(2);
  });

  it("refuses to revert when the lines at the hunk's position no longer match", () => {
    const before = doc(BASE);
    const after = doc(BASE.replace("Wrote documentation", "Wrote runbooks"));
    const [hunk] = diffUnits(before, after);
    const shifted = doc(BASE.replace("Wrote documentation", "Wrote runbooks").replace("# Ada Lovelace", "# Ada Lovelace\n\nNew line"));
    expect(revertHunk(shifted, hunk)).toBeNull();
  });
});
