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

  it("redacts international addresses and secret contacts while preserving technical identifiers", () => {
    const cases: [string, string, string][] = [
      ["email in body", "Reach me at ada.lovelace+jobs@example.co.uk for refs", "ada.lovelace+jobs@example.co.uk"],
      ["intl phone", "Mobile: +44 20 7946 0958", "7946 0958"],
      ["US phone parens", "Call (415) 555-0132 anytime", "555-0132"],
      ["US phone dots", "415.555.0132", "555.0132"],
      ["bare phone w/o label", "Ada Lovelace 4155550132", "4155550132"],
      ["https url", "Portfolio https://ada.dev/work?x=1", "ada.dev"],
      ["bare domain", "see linkedin.com/in/adalovelace", "adalovelace"],
      ["github handle path", "github.com/ada-l", "ada-l"],
      ["markdown link label w/ url", "[My site](https://ada.example)", "ada.example"],
      ["link label hides url", "[Portfolio](https://secret-portfolio.example)", "secret-portfolio"],
      ["US street", "123 Main Street, Springfield, IL 62701", "123 Main Street"],
      ["US street abbrev + apt", "Lives at 42 Elm St. Apt 5B", "42 Elm St"],
      ["UK street", "Flat 3, 10 Downing Street, London SW1A 2AA", "10 Downing Street"],
      ["German", "Hauptstraße 5, 10115 Berlin", "Hauptstraße 5"],
      ["French", "12 rue de Rivoli, Paris", "rue de Rivoli"],
      ["PO box", "PO Box 1234, Austin", "Box 1234"],
      ["unlisted suffix 'Row'", "221 Baker Row, London", "221 Baker Row"],
      ["Indian style", "Flat 402, Sai Residency, MG Road, Pune 411001", "MG Road"],
      ["zip only", "Springfield, IL 62701", "62701"],
      ["handle", "Twitter @ada_codes", "@ada_codes"],
    ];

    for (const [, line, secret] of cases) {
      const doc = markdownToDocument(`# Ada\n\n## Experience\n\n- Did work\n\n${line}`);
      const text = documentText(sharedDocument(doc, true));
      expect(text).not.toContain(secret);
    }

    const keep: [string, string, string][] = [
      ["date range", "Engineer, 2019 - 2023", "2019 - 2023"],
      ["metric", "Cut invoice latency by 38% across 1,200,000 invoices", "1,200,000"],
      ["Next.js", "Built apps in Next.js and Node.js", "Next.js"],
      ["version", "Upgraded to Spring Boot 3.2.1", "3.2.1"],
      ["team of", "Managed 12 engineers on 3 teams", "12 engineers"],
      ["ASP.NET", "Wrote ASP.NET services", "ASP.NET"],
      ["file names", "Maintained config.yml and main.go", "main.go"],
      ["S3 + percents", "Moved 400 TB to S3", "400 TB"],
      ["Way in sentence", "Found 3 ways to drive adoption", "3 ways to drive"],
      ["street word", "Shipped 2 Drive integrations", "2 Drive integrations"],
    ];

    for (const [, line, kept] of keep) {
      const doc = markdownToDocument(`# Ada\n\n## Experience\n\n- ${line}`);
      const text = documentText(sharedDocument(doc, true));
      expect(text).toContain(kept);
    }
  });
});
