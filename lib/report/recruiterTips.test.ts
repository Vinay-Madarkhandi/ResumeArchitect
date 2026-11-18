import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JobFacts } from "@/lib/schemas/jobFacts";
import { hasMetric, recruiterTips } from "./recruiterTips";
import type { RecruiterTipId } from "./report";
import { readResume } from "./resume";

const JOB: JobFacts = {
  title: "Backend Engineer",
  level: "mid",
  hardSkills: [{ term: "Go", importance: "high" }],
  softSkills: [],
  education: null,
  yearsRequired: null,
  predictedSkills: [],
};

const asOf = new Date(2026, 10, 18);

function tip(id: RecruiterTipId, markdown: string, job: Partial<JobFacts> = {}, jobText = "") {
  const resume = readResume(markdownToDocument(markdown));
  return recruiterTips({ resume, job: { ...JOB, ...job }, jobText, asOf }).find((c) => c.id === id)!;
}

const experience = (bullets: string[], dates = "Jan 2021 – Present") =>
  `# Ada\n\n## Experience\n\n### Engineer · ${dates}\n\n${bullets.map((b) => `- ${b}`).join("\n")}`;

describe("hasMetric", () => {
  it.each([
    ["Cut p99 latency 40%", true],
    ["Served 2M requests a day", true],
    ["Saved $120k a year", true],
    ["Doubled signups", true],
    ["Built services on AWS EC2 and S3", false],
    ["Engineer · Jan 2020 – Present", false],
    ["Call +1 415 555 0100", false],
    ["Led migration in 2021", false],
  ])("%s → %s", (line, expected) => {
    expect(hasMetric(line)).toBe(expected);
  });
});

describe("measurable results", () => {
  const metrics = ["Cut costs 30%", "Served 2M users", "Shipped 12 features", "Saved $40k", "Grew revenue 3x"];

  it("passes with five quantified lines", () => {
    expect(tip("measurable-results", experience(metrics)).status).toBe("pass");
  });

  it("warns with two to four and fails with fewer", () => {
    expect(tip("measurable-results", experience(metrics.slice(0, 2))).status).toBe("warn");
    const none = tip("measurable-results", experience(["Built services", "Wrote docs"]));
    expect(none.status).toBe("fail");
    expect(none.detail).toMatch(/^0 of your 2 achievement lines include a number/);
  });

  it("ignores numbers in skills and education lists", () => {
    const md = `${experience(["Built services"])}\n\n## Skills\n\nPython 3, 5 years Go\n\n## Education\n\nGPA 3.9`;
    expect(tip("measurable-results", md).detail).toMatch(/^0 of your 1/);
  });
});

describe("word count", () => {
  const words = (n: number) => experience([Array.from({ length: n }, () => "word").join(" ")]);

  it("passes inside the range for the role's level", () => {
    expect(tip("word-count", words(700)).status).toBe("pass");
    expect(tip("word-count", words(500), { level: "entry" }).status).toBe("pass");
  });

  it("warns outside the range with a direction to move", () => {
    const short = tip("word-count", words(450));
    expect(short.status).toBe("warn");
    expect(short.fix).toMatch(/^Add detail/);
    const long = tip("word-count", words(1000));
    expect(long.status).toBe("warn");
    expect(long.fix).toMatch(/toward 800 words/);
  });

  it("fails a resume that is far too short", () => {
    expect(tip("word-count", words(120)).status).toBe("fail");
  });
});

describe("words to avoid", () => {
  it("passes plain, specific writing", () => {
    expect(tip("words-to-avoid", experience(["Built payment services in Go"])).status).toBe("pass");
  });

  it("names each cliché with an alternative", () => {
    const c = tip("words-to-avoid", experience(["Responsible for billing", "A team player and self-starter"]));
    expect(c.status).toBe("warn");
    expect(c.detail).toBe('Found "responsible for", "team player", "self-starter". Recruiters skim past these.');
    expect(c.fix).toContain('"responsible for" → a verb that shows what you did');
  });

  it("fails four or more", () => {
    const c = tip("words-to-avoid", experience(["Responsible for billing", "Team player", "Hard worker", "Results-driven go-getter"]));
    expect(c.status).toBe("fail");
  });

  it("keeps a phrase the posting itself asks for", () => {
    expect(tip("words-to-avoid", experience(["Detail-oriented reviewer"]), {}, "We want someone detail-oriented.").status).toBe("pass");
  });
});

describe("web presence", () => {
  it("passes with any profile link and fails with none", () => {
    expect(tip("web-presence", `${experience(["Built"])}\n\ngithub.com/ada`).status).toBe("pass");
    expect(tip("web-presence", experience(["Built"])).status).toBe("fail");
  });
});

describe("job level match", () => {
  it("passes when experience meets the years asked for", () => {
    const c = tip("job-level-match", experience(["Built"], "Jan 2019 – Present"), { yearsRequired: 5 });
    expect(c.status).toBe("pass");
    expect(c.detail).toBe("Your dates add up to about 7.9 years of experience; the posting asks for 5+ years.");
  });

  it("warns when a year short and fails when further short", () => {
    expect(tip("job-level-match", experience(["Built"], "Jan 2022 – Present"), { yearsRequired: 5 }).status).toBe("warn");
    expect(tip("job-level-match", experience(["Built"], "Jan 2024 – Present"), { yearsRequired: 5 }).status).toBe("fail");
  });

  it("uses typical years for the level when the posting gives none", () => {
    expect(tip("job-level-match", experience(["Built"], "Jan 2023 – Present"), { level: "senior" }).status).toBe("warn");
    expect(tip("job-level-match", experience(["Built"], "Jan 2010 – Present"), { level: "entry" }).detail).toMatch(/overqualified/);
  });

  it("does not count years spent in school", () => {
    const md = `${experience(["Built"], "Jan 2024 – Present")}\n\n## Education\n\nBS · Sep 2010 – Jun 2014`;
    expect(tip("job-level-match", md).detail).toMatch(/about 2\.9 years/);
  });

  it("warns when there are no dates to read", () => {
    expect(tip("job-level-match", "# Ada\n\n## Experience\n\n- Built").status).toBe("warn");
  });
});
