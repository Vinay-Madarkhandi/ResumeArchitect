import { describe, expect, it } from "vitest";
import { CoverLetterReportSchema } from "@/lib/schemas/career";
import { clicheSpans, findCliches, namesCompany, namesRole, scanCoverLetter } from "./coverLetter";
import { NORTHWIND } from "./fixtures";

const filler = (n: number) => Array.from({ length: n }, () => "steady").join(" ");

const STRONG = `Dear Ms. Rivera,

I'm applying for the Backend Engineer role at Northwind. I build payment services in Go on PostgreSQL. ${filler(70)}

At Analytical Engines I built a Kafka pipeline that cut invoice latency by 38%. ${filler(70)}

I also ran the on-call rotation for our payments platform. ${filler(70)}

I'd welcome a conversation.

Ada Lovelace`;

const WEAK = `To whom it may concern,
I am writing to express my interest in this job. I am a team player and passionate about technology.`;

const check = (report: ReturnType<typeof scanCoverLetter>, id: string) => report.checks.find((c) => c.id === id);

describe("scanCoverLetter", () => {
  it("passes a specific, personal letter and finds the job's keywords", () => {
    const report = scanCoverLetter(STRONG, NORTHWIND);
    expect(report.checks.filter((c) => !c.passed)).toEqual([]);
    expect(report.keywords.filter((k) => !k.found).map((k) => k.term)).toEqual(["Kubernetes"]);
    expect(report.score.total).toBeGreaterThanOrEqual(90);
    expect(CoverLetterReportSchema.parse(report)).toEqual(report);
  });

  it("flags a generic letter on every count", () => {
    const report = scanCoverLetter(WEAK, NORTHWIND);
    for (const id of ["length", "paragraphs", "role", "company", "greeting", "measurable", "cliches"]) {
      expect(check(report, id)?.passed, id).toBe(false);
    }
    expect(report.cliches).toEqual(["i am writing to express my interest", "to whom it may concern", "team player", "passionate about"]);
    expect(report.score.total).toBeLessThan(15);
  });

  it("drops the company check when the posting doesn't name one", () => {
    const report = scanCoverLetter(STRONG, { ...NORTHWIND, company: null });
    expect(check(report, "company")).toBeUndefined();
  });

  it("matches the company without its legal suffix and the role without its seniority", () => {
    const report = scanCoverLetter(STRONG, { ...NORTHWIND, company: "Northwind, Inc." });
    expect(check(report, "company")?.passed).toBe(true);
    expect(check(report, "role")?.passed).toBe(true);
  });

  it("doesn't count a year as a measurable result", () => {
    expect(check(scanCoverLetter("Dear Sam,\n\nI joined in 2021.", NORTHWIND), "measurable")?.passed).toBe(false);
  });

  it("finds clichés regardless of case and curly apostrophes, but not inside other words", () => {
    expect(findCliches("A Team Player. Hardworking.")).toEqual(["team player", "hardworking"]);
    expect(findCliches("steamteam players")).toEqual([]);
  });
});

describe("naming the role and company", () => {
  it("accepts a distinctive short company name but not a lone role word", () => {
    expect(namesCompany("I admire Northwind.", "Northwind Payments")).toBe(true);
    expect(namesCompany("I admire America.", "Bank of America")).toBe(false);
    expect(namesCompany("I admire Global.", "Global Payments")).toBe(false);
    expect(namesRole("I love backend work.", "Senior Backend Engineer")).toBe(false);
    expect(namesRole("the backend engineer opening", "Senior Backend Engineer")).toBe(true);
  });
});

describe("clicheSpans", () => {
  it("marks each cliché where it appears, keeping the rest of the text intact", () => {
    const text = "I'm a Team Player and a team player.";
    const spans = clicheSpans(text, findCliches(text));
    expect(spans.filter((s) => s.cliche).map((s) => s.text)).toEqual(["Team Player", "team player"]);
    expect(spans.map((s) => s.text).join("")).toBe(text);
  });
});
