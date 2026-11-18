import { describe, expect, it } from "vitest";
import { matchPredictedSkills, matchSkills, matchTerm, postingCount } from "./keywords";
import { buildLexicon } from "./synonyms";

function ctx(resumeText: string, jobText = "") {
  return { resumeText, jobText, lexicon: buildLexicon(jobText, resumeText) };
}

describe("matchTerm", () => {
  it("finds a term as a whole word and counts every mention", () => {
    const m = matchTerm("Python", ctx("Built Python services. Python and Go daily."));
    expect(m).toEqual({ status: "found", resumeCount: 2, matchedForm: "Python", advice: null });
  });

  it("reports a term the resume never mentions as missing", () => {
    expect(matchTerm("Terraform", ctx("Deployed with Ansible"))).toEqual({
      status: "missing",
      resumeCount: 0,
      matchedForm: null,
      advice: null,
    });
  });

  it("does not find a term inside a longer word", () => {
    expect(matchTerm("Java", ctx("Wrote JavaScript")).status).toBe("missing");
    expect(matchTerm("SQL", ctx("Ran NoSQL stores")).status).toBe("missing");
  });

  it("accepts plurals and flexible separators", () => {
    expect(matchTerm("REST API", ctx("Designed REST APIs")).status).toBe("found");
    expect(matchTerm("CI/CD", ctx("owned the CI CD pipeline")).status).toBe("found");
    expect(matchTerm("Front-end", ctx("frontend work")).status).toBe("found");
  });

  it("matches the singular of a plural job term, but leaves product names alone", () => {
    expect(matchTerm("payments", ctx("Built payment services")).status).toBe("found");
    expect(matchTerm("data pipelines", ctx("Owned the data pipeline")).status).toBe("found");
    expect(matchTerm("Teams", ctx("Team lead for 4 engineers")).status).toBe("missing");
    expect(matchTerm("business", ctx("Grew the busines")).status).toBe("missing");
  });

  it("treats punctuation-only respellings as the same term", () => {
    expect(matchTerm("ReactJS", ctx("Built React.js apps"))).toMatchObject({ status: "found", matchedForm: "React.js" });
  });

  it("ignores everyday words that share a product name", () => {
    expect(matchTerm("Excel", ctx("I excel at planning")).status).toBe("missing");
    expect(matchTerm("Excel", ctx("Modeled forecasts in Excel")).status).toBe("found");
    expect(matchTerm("Go", ctx("Ready to go live")).status).toBe("missing");
    expect(matchTerm("React", ctx("Quick to react to incidents")).status).toBe("missing");
  });

  it.each([
    ["Go", "Go to market in 2027"],
    ["R", "Worked in R&D on Python projects"],
    ["React", "React promptly to JavaScript errors"],
    ["C", "C++ and C# programming"],
    ["Swift", "Swift response to customer issues"],
    ["Rust", "Rust removal from steel"],
    ["Spark", "Spark interest in STEM"],
    ["Python", "PréPythonÉ"],
    ["Python", "Python\u0301"],
    ["数据分析", "大数据分析师"],
  ])("ignores ambiguous or embedded %s in %s", (term, text) => {
    expect(matchTerm(term, ctx(text)).status).toBe("missing");
    expect(postingCount(term, ctx("", text))).toBe(1); // Minimum score weight for older stored facts.
  });

  it.each([
    ["Go", "Built services in Golang", "synonym"],
    ["Go", "Skills: Go", "found"],
    ["R", "Used the R language for modeling", "found"],
    ["R", "Technical Skills\nR", "found"],
    ["C", "Implemented device drivers in C", "found"],
    ["React", "Built a front-end with React and JavaScript", "found"],
    ["Swift", "Built an iOS app in Swift", "found"],
    ["Rust", "Developed Rust crates", "found"],
    ["Spark", "Ran Spark workloads on Databricks", "found"],
    ["数据分析", "技能：数据分析、机器学习", "found"],
  ])("finds %s with clear boundaries and context in %s", (term, text, status) => {
    expect(matchTerm(term, ctx(text)).status).toBe(status);
  });

  it("matches short acronyms by case only", () => {
    expect(matchTerm("IT", ctx("it was great")).status).toBe("missing");
    expect(matchTerm("IT", ctx("Ran IT support")).status).toBe("found");
  });

  it("credits an abbreviation as a synonym and tells the user to write both forms", () => {
    const m = matchTerm("Kubernetes", ctx("Ran services on k8s"));
    expect(m).toMatchObject({ status: "synonym", resumeCount: 1, matchedForm: "k8s" });
    expect(m.advice).toContain('"Kubernetes (k8s)"');
  });

  it("credits a spelling variant as a synonym and asks for the posting's spelling", () => {
    const m = matchTerm("PostgreSQL", ctx("Tuned Postgres queries"));
    expect(m).toMatchObject({ status: "synonym", matchedForm: "Postgres" });
    expect(m.advice).toContain("posting's spelling");
  });

  it("counts the exact term and its synonyms together, once per mention", () => {
    expect(matchTerm("JavaScript", ctx("JavaScript and JS tooling")).resumeCount).toBe(2);
  });

  it("asks for both forms when the posting writes both and the resume one", () => {
    const m = matchTerm("SEO", ctx("Led SEO audits", "Own SEO. Search engine optimization experience required."));
    expect(m.status).toBe("found");
    expect(m.advice).toContain('"Search engine optimization (SEO)"');
  });

  it("uses acronyms the posting defines even when the table lacks them", () => {
    const m = matchTerm("AFT", ctx("Built applicant flow tracking dashboards", "Experience with applicant flow tracking (AFT)."));
    expect(m).toMatchObject({ status: "synonym", matchedForm: "applicant flow tracking" });
  });
});

describe("postingCount", () => {
  it("counts the term and its synonyms in the posting", () => {
    const job = "Kubernetes experience. You'll run K8s clusters. Kubernetes on-call.";
    expect(postingCount("Kubernetes", ctx("", job))).toBe(3);
  });

  it("is at least 1 even when the extractor normalized the posting's wording", () => {
    expect(postingCount("Terraform", ctx("", "Infrastructure tooling"))).toBe(1);
  });
});

describe("matchSkills", () => {
  it("orders high importance first, then by mentions in the posting", () => {
    const job = "Go programming, Go services, Go APIs. Docker. Kubernetes Kubernetes.";
    const skills = matchSkills(
      [
        { term: "Docker", importance: "medium" },
        { term: "Go", importance: "high" },
        { term: "Kubernetes", importance: "medium" },
      ],
      ctx("Skills: Go", job),
    );
    expect(skills.map((s) => [s.term, s.jdCount])).toEqual([
      ["Go", 3],
      ["Kubernetes", 2],
      ["Docker", 1],
    ]);
  });
});

describe("matchPredictedSkills", () => {
  it("keeps the reason and reports status without a posting count", () => {
    const [m] = matchPredictedSkills([{ term: "Docker", reason: "Most backend roles ship containers." }], ctx("Docker images"));
    expect(m).toEqual({
      status: "found",
      resumeCount: 1,
      matchedForm: "Docker",
      advice: null,
      term: "Docker",
      reason: "Most backend roles ship containers.",
    });
  });
});
