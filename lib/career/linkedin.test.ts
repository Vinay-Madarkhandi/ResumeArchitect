import { describe, expect, it } from "vitest";
import { LinkedInProfileSchema, LinkedInReportSchema } from "@/lib/schemas/career";
import { customUrlStatus, parseSkills, reviewLinkedIn } from "./linkedin";
import { NORTHWIND } from "./fixtures";

const about = `Backend engineer building Go and PostgreSQL payment services. ${"I care about reliable systems and clear on-call practice. ".repeat(20)}`;

const STRONG = LinkedInProfileSchema.parse({
  headline: "Senior Backend Engineer | Go, PostgreSQL, Kafka | Payments platforms that stay up during peak traffic",
  about,
  experience: `Senior Engineer, Analytical Engines
2020 – Present
- Built a Kafka pipeline that cut invoice latency by 38%
- Ran the on-call rotation for a team of 12 engineers
- Moved payment services to Go backed by PostgreSQL`,
  skills: "Go, PostgreSQL, Kafka, Docker, Incident response, Payments",
  url: "https://www.linkedin.com/in/ada-lovelace/",
});

const failing = (report: ReturnType<typeof reviewLinkedIn>) => report.checks.filter((c) => !c.passed).map((c) => c.id);

describe("reviewLinkedIn", () => {
  it("passes a complete profile and says where each keyword was found", () => {
    const report = reviewLinkedIn(STRONG, NORTHWIND);
    expect(failing(report)).toEqual([]);
    expect(report.keywords?.find((k) => k.term === "Kafka")?.where).toEqual(["headline", "experience", "skills"]);
    expect(report.keywords?.find((k) => k.term === "Kubernetes")).toMatchObject({ found: false, where: [] });
    expect(LinkedInReportSchema.parse(report)).toEqual(report);
  });

  it("flags a thin profile", () => {
    const thin = LinkedInProfileSchema.parse({ headline: "Engineer at Analytical Engines", skills: "Go", url: "linkedin.com/in/ada-lovelace-1a2b3c4d" });
    expect(failing(reviewLinkedIn(thin, NORTHWIND))).toEqual([
      "headline_length", "headline_default", "about_length", "skills_count", "experience_detail",
      "experience_measurable", "custom_url", "headline_keywords", "about_hook", "skills_target",
    ]);
  });

  it("skips the keyword checks and gives their weight to the rest without a target", () => {
    const report = reviewLinkedIn(STRONG, null);
    expect(report.keywords).toBeNull();
    expect(report.checks.map((c) => c.id)).not.toContain("headline_keywords");
    expect(report.score.parts).toHaveLength(1);
    expect(report.score.total).toBe(100);
  });

  it("finds a keyword in the About preview through its alias", () => {
    const profile = { ...STRONG, about: `Golang engineer. ${"Steady work. ".repeat(100)}` };
    const hook = reviewLinkedIn(profile, NORTHWIND).checks.find((c) => c.id === "about_hook");
    expect(hook).toMatchObject({ passed: true, detail: expect.stringContaining("Go") });
  });
});

describe("profile helpers", () => {
  it("tells custom URLs from LinkedIn's generated ones", () => {
    expect(customUrlStatus("")).toBe("missing");
    expect(customUrlStatus("https://example.com/ada")).toBe("invalid");
    expect(customUrlStatus("linkedin.com/in/ada-lovelace-123456789")).toBe("default");
    expect(customUrlStatus("https://uk.linkedin.com/in/adalovelace?trk=x")).toBe("custom");
    expect(customUrlStatus("https://www.linkedin.com/in/ada-lovelace-1815")).toBe("custom");
  });

  it("splits skills on commas, bullets, and lines without duplicates", () => {
    expect(parseSkills("Go, PostgreSQL\n• Kafka · go | Docker;")).toEqual(["Go", "PostgreSQL", "Kafka", "Docker"]);
  });

  it("requires at least one section", () => {
    expect(LinkedInProfileSchema.safeParse({ url: "linkedin.com/in/ada" }).success).toBe(false);
  });
});
