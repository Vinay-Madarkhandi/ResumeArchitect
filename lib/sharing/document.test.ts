import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { documentText } from "@/lib/resume/units";
import { contactBlockOptions, sharedDocument } from "./document";

describe("sharedDocument", () => {
  it("redacts contact details throughout a heading-free body without dropping surrounding content", () => {
    const master = markdownToDocument(
      "# Ada Sparse\n\nSorted product samples.\n\nBased at 12 Baker Street; organized deliveries.\n\n"
      + "- Wrote docs at linkedin.com/in/ada. Kept docs current.\n"
      + "- Run builds in Next.js, contact **ada**@example.com or +44 20 7946 0958.\n"
      + "- Built a [pipeline](https://example.test/ada) and ran testing.\n"
      + "- Shipped monthly during 2020 - 2024.",
    );
    const snapshot = sharedDocument(master, true);
    const visible = documentText(snapshot);
    for (const body of ["Ada Sparse", "Sorted product samples.", "organized deliveries.", "Kept docs current.", "Next.js", "Built a pipeline", "2020 - 2024"]) {
      expect(visible).toContain(body);
    }
    for (const privateDetail of ["Baker Street", "linkedin.com", "ada@example.com", "7946", "https://example.test/ada"]) {
      expect(JSON.stringify(snapshot)).not.toContain(privateDetail);
    }
    expect(documentText(sharedDocument(master, false))).toBe(documentText(master));
    expect(documentText(master)).toContain("Baker Street");
  });

  it("lets the user explicitly hide unstructured blocks including a nested item", () => {
    const master = markdownToDocument("# Ada\n\nLondon\n\n- Built tools\n- Find me at my home studio");
    const selected = contactBlockOptions(master).filter(({ label }) => /London|studio/.test(label)).map(({ index }) => index);
    expect(documentText(sharedDocument(master, true, selected))).toBe("Ada\nBuilt tools");
  });
});
