import { describe, expect, it } from "vitest";
import { exportJobsCsv, importJobsCsv } from "./csv";
import { jobSchema, type JobRecord } from "./schema";

describe("tracker CSV", () => {
  it("round-trips details, archived state and dated history", () => {
    const job: JobRecord = {
      ...jobSchema.parse({
        title: '=HYPERLINK("https://example.org")',
        company: "'Digital, Inc.",
        location: "Berlin",
        salary: "€80k–95k",
        url: "https://example.com/job?id=1",
        description: 'Build features, ship "carefully".\r\nWork with the platform team.',
        stage: "withdrawn",
        notes: "\tKeep in touch",
        contacts: [{ name: "Sam", role: "Recruiter", email: "sam@example.com", linkedin: "" }],
        interviews: ["2026-12-15", "2026-12-18"],
        followUp: "2026-12-16",
        excitement: 4,
      }),
      archived: true,
      updatedAt: "2026-12-06T12:00:00Z",
      history: [{ stage: "saved", at: "2026-12-05T12:00:00Z" }, { stage: "withdrawn", at: "2026-12-06T12:00:00Z" }],
    };
    const { updatedAt, ...exported } = job;
    expect(updatedAt).toBe(job.history.at(-1)?.at);
    const csv = exportJobsCsv([job]);
    expect(csv).toContain(`"'=HYPERLINK`);
    expect(importJobsCsv(csv)).toEqual([exported]);
  });

  it("accepts a spreadsheet with a title column and leaves original apostrophes alone", () => {
    const [job] = importJobsCsv("\uFEFFTitle,Company,Follow-up\nEngineer,'Studio,2027-01-01\n");
    expect(job).toMatchObject({ title: "Engineer", stage: "saved", company: "'Studio", followUp: "2027-01-01" });
  });

  it("rejects malformed fields, row lengths, and dates with line numbers", () => {
    expect(() => importJobsCsv('title,description\nEngineer,"missing quote')).toThrow("unclosed quoted field");
    expect(() => importJobsCsv("title,company\nEngineer")).toThrow("CSV row 2");
    expect(() => importJobsCsv("title,followUp\nEngineer,2026-02-30")).toThrow("Invalid followUp");
  });
});
