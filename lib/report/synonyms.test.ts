import { describe, expect, it } from "vitest";
import { acronymPairs, buildLexicon, formKey, SYNONYM_GROUPS } from "./synonyms";

describe("SYNONYM_GROUPS", () => {
  it("gives every form exactly one meaning", () => {
    const owners = new Map<string, (typeof SYNONYM_GROUPS)[number]>();
    for (const group of SYNONYM_GROUPS) {
      for (const form of group.forms) {
        const owner = owners.get(formKey(form)) ?? group;
        expect(owner, `"${form}" also means [${owner.forms.join(", ")}]`).toBe(group);
        owners.set(formKey(form), group);
      }
    }
  });

  it("is a sizable table across fields, not a handful of tech terms", () => {
    expect(SYNONYM_GROUPS.length).toBeGreaterThanOrEqual(180);
    const lexicon = buildLexicon();
    for (const term of ["SEO", "GAAP", "EHR", "HRIS", "OSHA", "PMP", "Kubernetes", "MBA"]) {
      expect(lexicon(term), term).not.toBeNull();
    }
  });
});

describe("buildLexicon", () => {
  const lexicon = buildLexicon();

  it.each([
    ["JS", "JavaScript"],
    ["javascript", "JS"],
    ["k8s", "Kubernetes"],
    ["ML", "Machine Learning"],
    ["machine learning", "ML"],
    ["nodejs", "Node.js"],
    ["Postgres", "PostgreSQL"],
    ["ci-cd", "CI/CD"],
  ])("finds %s and %s in the same group", (a, b) => {
    expect(lexicon(a)?.forms).toContain(b);
  });

  it("marks acronyms as abbreviations and respellings as variants", () => {
    expect(lexicon("Kubernetes")?.kind).toBe("abbreviation");
    expect(lexicon("PostgreSQL")?.kind).toBe("variant");
  });

  it("returns null for a term with no known equivalent", () => {
    expect(lexicon("Terraform")).toBeNull();
  });

  it("adds acronyms the posting defines itself", () => {
    const fromPosting = buildLexicon("Experience with applicant flow tracking (AFT) required.");
    expect(fromPosting("AFT")?.forms).toEqual(["applicant flow tracking", "AFT"]);
    expect(buildLexicon()("AFT")).toBeNull();
  });
});

describe("acronymPairs", () => {
  it("reads long form before and after the acronym", () => {
    expect(acronymPairs("Own our search engine optimization (SEO) roadmap.")[0].forms).toEqual([
      "search engine optimization",
      "SEO",
    ]);
    expect(acronymPairs("Run PPC (Pay-Per-Click) campaigns.")[0].forms).toEqual(["Pay-Per-Click", "PPC"]);
    expect(acronymPairs("Build Customer Data Platform (CDP) pipelines")[0].forms).toEqual([
      "Customer Data Platform",
      "CDP",
    ]);
  });

  it("allows small words inside the long form", () => {
    expect(acronymPairs("Knowledge of Research and Development (R&D) tax credits")[0].forms).toEqual([
      "Research and Development",
      "R&D",
    ]);
  });

  it("ignores parentheses that are not a definition", () => {
    expect(acronymPairs("Five years of experience (required)")).toEqual([]);
    expect(acronymPairs("Strong AWS (EC2, S3, Lambda) skills")).toEqual([]);
    expect(acronymPairs("Fluent in Spanish (ES)")).toEqual([]);
  });
});
