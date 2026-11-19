import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { extractJob } from "./extractor.js";

function fixture(name: string, url: string) {
  const { document } = parseHTML(readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8"));
  return extractJob(document, url);
}

describe("job clipper extractor", () => {
  it("prefers matching JSON-LD, including nested JobPosting markup, location, and a salary range", () => {
    expect(fixture("structured", "https://example.test/jobs/42#description")).toEqual({
      title: "Systems Engineer",
      company: "Northwind",
      location: "Remote · Germany",
      salary: "EUR 80000–100000 / year",
      description: "Build systems & write tests.\nIncident response\nGo",
      url: "https://example.test/jobs/42",
    });
  });

  it.each([
    ["linkedin", "https://www.linkedin.com/jobs/view/123", "Platform Engineer", "Contoso", "Berlin", "€75,000 – €90,000", "Operate the platform."],
    ["indeed", "https://ca.indeed.com/viewjob?jk=123", "Senior Data Engineer", "Adventure Works", "Toronto", "$120,000 a year", "Build data pipelines."],
    ["greenhouse", "https://job-boards.greenhouse.io/fabrikam/jobs/12", "Design Engineer", "Fabrikam", "New York", "$130,000–$160,000", "Build accessible web apps."],
    ["lever", "https://jobs.lever.co/tailspin/12", "Security Engineer", "Tailspin Toys", "Austin", "$140k–$160k", "Build secure services."],
    ["workday", "https://example.wd3.myworkdayjobs.com/en-US/careers/job/x", "Software Engineer", "Wide World Importers", "London", "£65,000 to £85,000", "Build developer tools."],
  ])("extracts visible %s job fields", (name, url, title, company, location, salary, description) => {
    expect(fixture(name, url)).toMatchObject({ title, company, location, salary, description: expect.stringContaining(description) });
  });

  it("keeps readable description lines and drops hidden and navigation content", () => {
    expect(fixture("readable", "https://careers.example.org/roles/123")).toMatchObject({
      title: "Product Manager",
      company: "Alpine Ski House",
      description: "Product Manager\nDecide what to build next.\nWork with a small team.",
    });
  });
});
