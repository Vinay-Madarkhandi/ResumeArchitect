import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { findEmail, findLinkedIn, findName, findPhone, readResume, sectionKind, sectionText, webProfiles, wordCount } from "./resume";

const RESUME = `# Ada Lovelace

ada@example.com · +1 (415) 555-0100 · [LinkedIn](https://www.linkedin.com/in/ada-lovelace)

## Professional Summary

Backend engineer.

## Where I've Been

### Engineer · Jan 2020 – Present

- Built things

## EDUCATION

B.S. Computer Science, 2016`;

describe("sectionKind", () => {
  it.each([
    ["Work Experience", "experience"],
    ["PROFESSIONAL EXPERIENCE:", "experience"],
    ["Employment History", "experience"],
    ["Technical Skills", "skills"],
    ["Skills & Tools", "skills"],
    ["Education", "education"],
    ["Licenses & Certifications", "certifications"],
    ["Summary", "summary"],
    ["Where I've Been", null],
  ])("reads %s as %s", (heading, kind) => {
    expect(sectionKind(heading)).toBe(kind);
  });
});

describe("readResume", () => {
  const resume = readResume(markdownToDocument(RESUME));

  it("files lines under their section headings, creative names included", () => {
    expect(resume.sections.map((s) => [s.heading, s.kind])).toEqual([
      ["Professional Summary", "summary"],
      ["Where I've Been", null],
      ["EDUCATION", "education"],
    ]);
    expect(resume.header.map((u) => u.text)).toEqual([
      "Ada Lovelace",
      "ada@example.com · +1 (415) 555-0100 · LinkedIn",
    ]);
  });

  it("keeps role lines inside their section", () => {
    expect(resume.sections[1].units.map((u) => u.text)).toEqual(["Engineer · Jan 2020 – Present", "Built things"]);
  });

  it("collects link targets hidden behind link text", () => {
    expect(resume.links).toEqual(["https://www.linkedin.com/in/ada-lovelace"]);
  });

  it("returns a section's text, or null when the resume lacks it", () => {
    expect(sectionText(resume, "education")).toBe("B.S. Computer Science, 2016");
    expect(sectionText(resume, "skills")).toBeNull();
  });

  it("treats a known section name in a plain paragraph as a heading", () => {
    const plain = readResume(markdownToDocument("Ada Lovelace\n\nExperience\n\nBuilt things\n\nSkills\n\nGo"));
    expect(plain.sections.map((s) => s.kind)).toEqual(["experience", "skills"]);
  });
});

describe("contact details", () => {
  it("finds the name on the first line", () => {
    expect(findName(readResume(markdownToDocument(RESUME)))).toBe("Ada Lovelace");
    expect(findName(readResume(markdownToDocument("Resume\n\nGrace Hopper\n\n## Skills")))).toBe("Grace Hopper");
  });

  it("does not take a contact line or a section heading for a name", () => {
    expect(findName(readResume(markdownToDocument("ada@example.com | 415 555 0100\n\n## Skills")))).toBeNull();
    expect(findName(readResume(markdownToDocument("## Experience\n\nBuilt things")))).toBeNull();
  });

  it("finds email and phone, and does not read a date range as a phone", () => {
    expect(findEmail("Reach me: ada.l+jobs@mail.example.co.uk")).toBe("ada.l+jobs@mail.example.co.uk");
    expect(findPhone("+91 88560 94992")).toBe("+91 88560 94992");
    expect(findPhone("(415) 555-0100")).toBe("(415) 555-0100");
    expect(findPhone("2019 - 2021 and 2021-2023")).toBeNull();
  });

  it("finds LinkedIn in text or behind a link", () => {
    expect(findLinkedIn({ text: "linkedin.com/in/ada", links: [] })).toBe("linkedin.com/in/ada");
    expect(findLinkedIn({ text: "LinkedIn", links: ["https://linkedin.com/in/ada"] })).toBe("linkedin.com/in/ada");
    expect(findLinkedIn({ text: "LinkedIn", links: [] })).toBeNull();
  });

  it("lists each web profile once", () => {
    const profiles = webProfiles({
      text: "github.com/ada · https://ada.dev · Node.js · ASP.NET",
      links: ["https://linkedin.com/in/ada", "https://github.com/ada"],
    });
    expect(profiles).toEqual(["linkedin.com/in/ada", "github.com/ada", "https://ada.dev"]);
  });
});

describe("wordCount", () => {
  it("counts words, not separators", () => {
    expect(wordCount("Built  APIs · in Go | 40% faster")).toBe(6);
  });
});
