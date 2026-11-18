import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JobFacts } from "@/lib/schemas/jobFacts";
import type { LayoutFacts, ResumeFileFacts, SearchabilityCheckId } from "./report";
import { readResume } from "./resume";
import { resumeDegree, searchabilityChecks } from "./searchability";
import { buildLexicon } from "./synonyms";

const JOB: JobFacts = {
  title: "Senior Backend Engineer",
  level: "senior",
  hardSkills: [{ term: "Go", importance: "high" }],
  softSkills: [],
  education: { degree: "bachelor", fields: ["Computer Science"], equivalentExperience: false },
  yearsRequired: 5,
  predictedSkills: [],
};

const GOOD = `# Ada Lovelace

ada@example.com · +1 415 555 0100 · linkedin.com/in/ada

## Summary

Senior Backend Engineer with eight years building payment services in Go.

## Work Experience

### Backend Engineer · Jan 2018 – Present

- Built Go services

## Education

B.S. Computer Science · Aug 2012 – May 2016

## Skills

Go, PostgreSQL`;

const NO_LAYOUT: LayoutFacts = {
  tables: 0,
  images: 0,
  textBoxes: 0,
  columns: 1,
  headerText: "",
  footerText: "",
  fonts: ["Calibri"],
  bulletChars: ["•"],
};

function check(
  id: SearchabilityCheckId,
  markdown: string,
  { job = JOB, file = null }: { job?: JobFacts; file?: ResumeFileFacts | null } = {},
) {
  const resume = readResume(markdownToDocument(markdown));
  const checks = searchabilityChecks({
    resume,
    job,
    file,
    match: { resumeText: resume.text, jobText: "", lexicon: buildLexicon() },
  });
  return checks.find((c) => c.id === id) ?? null;
}

describe("a well-formed resume", () => {
  it("passes every searchability check that applies", () => {
    const resume = readResume(markdownToDocument(GOOD));
    const checks = searchabilityChecks({
      resume,
      job: JOB,
      file: { format: "docx", ...NO_LAYOUT },
      match: { resumeText: resume.text, jobText: "", lexicon: buildLexicon() },
    });
    expect(checks.filter((c) => c.status !== "pass")).toEqual([]);
    expect(checks.map((c) => c.id)).toEqual([
      "contact-name",
      "contact-email",
      "contact-phone",
      "contact-linkedin",
      "summary",
      "section-headings",
      "date-format",
      "education-match",
      "job-title-match",
      "file-type",
    ]);
  });
});

describe("contact checks", () => {
  it("fails a resume whose first line is not a name", () => {
    expect(check("contact-name", "ada@example.com\n\n## Skills\n\nGo")?.status).toBe("fail");
  });

  it("fails missing email and phone with a fix", () => {
    const c = check("contact-email", "# Ada Lovelace\n\n## Skills");
    expect(c).toMatchObject({ status: "fail" });
    expect(c?.fix).toBeTruthy();
    expect(check("contact-phone", "# Ada Lovelace\n\n## Skills")?.status).toBe("fail");
  });

  it("names the Word header when contact details live only there", () => {
    const file: ResumeFileFacts = { format: "docx", ...NO_LAYOUT, headerText: "Ada Lovelace\nada@example.com · 415 555 0100" };
    const email = check("contact-email", "## Skills\n\nGo", { file });
    expect(email).toMatchObject({ status: "fail" });
    expect(email?.detail).toMatch(/Word header/);
    expect(check("contact-name", "## Skills\n\nGo", { file })?.detail).toMatch(/Word header/);
  });

  it("reads an email behind a mailto link", () => {
    expect(check("contact-email", "# Ada Lovelace\n\n[Email me](mailto:ada@example.com)")?.status).toBe("pass");
  });

  it("warns when LinkedIn is named but the URL is hidden", () => {
    const hidden = check("contact-linkedin", "# Ada Lovelace\n\nLinkedIn | GitHub");
    expect(hidden?.status).toBe("warn");
    expect(hidden?.detail).toMatch(/URL isn't written out/);
    expect(check("contact-linkedin", "# Ada Lovelace\n\n[LinkedIn](https://linkedin.com/in/ada)")?.status).toBe("pass");
  });

  it("does not read LinkedIn Ads in a bullet as a hidden profile link", () => {
    const c = check("contact-linkedin", "# Ada Lovelace\n\n## Experience\n\n- Ran LinkedIn Ads campaigns");
    expect(c?.detail).toMatch(/^No LinkedIn URL was found/);
  });
});

describe("summary", () => {
  it("warns on an untitled summary paragraph and fails with none", () => {
    const untitled = `# Ada Lovelace\n\n${"Backend engineer who builds reliable payment systems at scale for fast growing fintech companies across three continents."}\n\n## Experience`;
    expect(check("summary", untitled)?.status).toBe("warn");
    expect(check("summary", "# Ada Lovelace\n\n## Experience\n\nBuilt things")?.status).toBe("fail");
  });
});

describe("section headings", () => {
  it("fails without an Experience heading and suggests renames for creative ones", () => {
    const c = check("section-headings", "# Ada\n\n## Where I've Been\n\nBuilt things\n\n## Education\n\nBS\n\n## Skills\n\nGo");
    expect(c?.status).toBe("fail");
    expect(c?.fix).toContain('"Where I\'ve Been" → "Work Experience"');
  });

  it("warns when Education or Skills is missing", () => {
    const c = check("section-headings", "# Ada\n\n## Experience\n\nBuilt things");
    expect(c?.status).toBe("warn");
    expect(c?.detail).toContain('"Education" or "Skills"');
  });
});

describe("date format", () => {
  const withDates = (dates: string) => `# Ada\n\n## Experience\n\n${dates}`;

  it("passes one consistent style", () => {
    expect(check("date-format", withDates("Engineer · Jan 2020 – Present\n\nIntern · Jun 2019 – Aug 2019"))?.status).toBe("pass");
  });

  it("warns when styles are mixed and quotes an example of each", () => {
    const c = check("date-format", withDates("Engineer · Jan 2020 – Present\n\nIntern · 06/2019 – 08/2019"));
    expect(c?.status).toBe("warn");
    expect(c?.detail).toContain('"Jan 2020", "06/2019"');
  });

  it("warns on seasons and two-digit years", () => {
    expect(check("date-format", withDates("Intern · Summer 2019"))?.status).toBe("warn");
    expect(check("date-format", withDates("Intern · Jun '19 – Aug '19"))?.status).toBe("warn");
  });

  it("reads dates under a creative section name", () => {
    const c = check("date-format", "# Ada\n\n## My Journey\n\n### Engineer · 03/2022 – Present\n\n### Analyst · June 2020 – Feb 2022");
    expect(c?.status).toBe("warn");
    expect(c?.detail).toContain('"03/2022", "June 2020", "Feb 2022"');
  });

  it("warns on years without months and fails with no dates", () => {
    expect(check("date-format", withDates("Engineer · 2018 – 2022"))?.status).toBe("warn");
    expect(check("date-format", withDates("Engineer at Acme"))?.status).toBe("fail");
  });
});

describe("education match", () => {
  it("is left out when the posting names no degree", () => {
    expect(check("education-match", GOOD, { job: { ...JOB, education: null } })).toBeNull();
  });

  it("passes a higher degree in the named field", () => {
    expect(check("education-match", GOOD.replace("B.S.", "M.S."))?.status).toBe("pass");
  });

  it("warns when the level matches but the field differs", () => {
    expect(check("education-match", GOOD.replace("B.S. Computer Science", "B.A. History"))?.status).toBe("warn");
  });

  it("fails a missing degree, and warns when experience can stand in", () => {
    const noDegree = GOOD.replace("B.S. Computer Science", "Coursework in Go");
    expect(check("education-match", noDegree)?.status).toBe("fail");
    const lenient = { ...JOB, education: { ...JOB.education!, equivalentExperience: true } };
    expect(check("education-match", noDegree, { job: lenient })?.status).toBe("warn");
  });
});

describe("resumeDegree", () => {
  const degreeOf = (md: string) => resumeDegree(readResume(markdownToDocument(md)));

  it("reads abbreviations only inside Education", () => {
    expect(degreeOf("# Ada\n\n## Education\n\nMS, Statistics")).toBe("master");
    expect(degreeOf("# Ada\n\n## Skills\n\nMS Office, Excel")).toBeNull();
  });

  it("reads spelled-out degrees anywhere and takes the highest", () => {
    expect(degreeOf("# Ada\n\nBachelor of Arts. Ph.D. candidate")).toBe("doctorate");
  });
});

describe("job title match", () => {
  it("passes the exact title and ignores team and location suffixes", () => {
    const job = { ...JOB, title: "Senior Backend Engineer - Payments (Remote)" };
    expect(check("job-title-match", GOOD, { job })?.status).toBe("pass");
  });

  it("warns when only the title without seniority appears", () => {
    const c = check("job-title-match", "# Ada\n\n## Experience\n\n### Backend Engineer · 2020 – 2024");
    expect(c?.status).toBe("warn");
    expect(c?.fix).toContain('"Senior Backend Engineer"');
  });

  it("fails when the title is absent", () => {
    expect(check("job-title-match", "# Ada\n\n## Experience\n\n### Data Analyst")?.status).toBe("fail");
  });
});

describe("file type", () => {
  it("is left out for a pasted resume", () => {
    expect(check("file-type", GOOD)).toBeNull();
  });

  it.each([
    [{ format: "docx", ...NO_LAYOUT }, "pass"],
    [{ format: "pdf", hasTextLayer: true, ...NO_LAYOUT }, "pass"],
    [{ format: "pdf", hasTextLayer: false, ...NO_LAYOUT }, "fail"],
    [{ format: "other", extension: "doc" }, "warn"],
    [{ format: "other", extension: "pages" }, "fail"],
    [{ format: "other", extension: "png" }, "fail"],
  ] as const)("grades %o as %s", (file, status) => {
    expect(check("file-type", GOOD, { file })?.status).toBe(status);
  });
});
