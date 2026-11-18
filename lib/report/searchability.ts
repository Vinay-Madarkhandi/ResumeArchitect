import { DEGREES, type Degree, type JobFacts } from "@/lib/schemas/jobFacts";
import { dateStyles, findDates } from "./dates";
import { formPattern, matchTerm, type MatchContext } from "./keywords";
import { fail, pass, warn, type Check, type ResumeFileFacts, type SearchabilityCheckId } from "./report";
import {
  findEmail,
  findLinkedIn,
  findName,
  findPhone,
  sectionText,
  type ResumeModel,
  type SectionKind,
} from "./resume";

/**
 * Can an ATS find and file the resume's key facts? (docs/research/jobscan.md
 * §3.3). Each check returns null when it doesn't apply, e.g. the education
 * check for a posting that names no degree.
 */

type SearchabilityCheck = Check<SearchabilityCheckId>;

export interface SearchabilityInput {
  resume: ResumeModel;
  job: JobFacts;
  file: ResumeFileFacts | null;
  match: MatchContext;
}

function inWordHeaderOnly(file: ResumeFileFacts | null, find: (text: string) => string | null): boolean {
  if (!file || file.format === "other") return false;
  return [file.headerText, file.footerText].some((t) => t !== null && find(t) !== null);
}

const HEADER_FIX = "Move it into the body of the page, just under your name; many ATS skip Word headers and footers.";

function contactName({ resume, file }: SearchabilityInput): SearchabilityCheck {
  const label = "Name";
  const name = findName(resume);
  if (name) return pass("contact-name", label, `"${name}" leads the page, where an ATS expects the candidate's name.`);
  const firstHeaderLine = (t: string) => {
    const line = t.split("\n")[0]?.trim() ?? "";
    return /^[\p{L}][\p{L}.'\- ]{2,40}$/u.test(line) && line.split(/\s+/).length <= 5 ? line : null;
  };
  if (inWordHeaderOnly(file, firstHeaderLine)) {
    return fail("contact-name", label, "Your name is in the Word header, not on the page itself.", HEADER_FIX);
  }
  return fail("contact-name", label, "The first line isn't your name, so an ATS may file you under the wrong name.", "Make your full name the first line of the resume, on its own.");
}

function contactEmail({ resume, file }: SearchabilityInput): SearchabilityCheck {
  const label = "Email address";
  const email = findEmail(resume.text) ?? resume.links.map((l) => l.replace(/^mailto:/i, "")).map(findEmail).find(Boolean);
  if (email) return pass("contact-email", label, `Found ${email}.`);
  if (inWordHeaderOnly(file, findEmail)) {
    return fail("contact-email", label, "Your email address is only in the Word header or footer.", HEADER_FIX);
  }
  return fail("contact-email", label, "No email address was found, so a recruiter can't reply.", "Add your email address to the contact line under your name.");
}

function contactPhone({ resume, file }: SearchabilityInput): SearchabilityCheck {
  const label = "Phone number";
  const phone = findPhone(resume.text);
  if (phone) return pass("contact-phone", label, `Found ${phone}.`);
  if (inWordHeaderOnly(file, findPhone)) {
    return fail("contact-phone", label, "Your phone number is only in the Word header or footer.", HEADER_FIX);
  }
  return fail("contact-phone", label, "No phone number was found.", "Add a phone number, with country code if you apply abroad, to the contact line.");
}

function contactLinkedIn({ resume }: SearchabilityInput): SearchabilityCheck {
  const label = "LinkedIn profile";
  const url = findLinkedIn(resume);
  if (url) return pass("contact-linkedin", label, `Found ${url}.`);
  if (/\blinked\s?in\b/i.test(resume.text)) {
    return warn(
      "contact-linkedin",
      label,
      'You mention LinkedIn but the URL isn\'t written out, and many ATS keep only the visible text.',
      "Write the address itself, e.g. linkedin.com/in/your-name.",
    );
  }
  return warn("contact-linkedin", label, "No LinkedIn URL was found. Recruiters check it before calling.", "Add your LinkedIn URL to the contact line, e.g. linkedin.com/in/your-name.");
}

function summary({ resume }: SearchabilityInput): SearchabilityCheck {
  const label = "Summary";
  const titled = resume.sections.find((s) => s.kind === "summary");
  if (titled) return pass("summary", label, `Your resume opens with a "${titled.heading}" section.`);
  const untitled = resume.header.find((u) => u.kind === "paragraph" && !u.text.includes("@") && u.text.split(/\s+/).length >= 15);
  if (untitled) {
    return warn("summary", label, "You have a summary paragraph, but no heading tells an ATS what it is.", 'Put a "Summary" heading above it.');
  }
  return fail(
    "summary",
    label,
    "There's no summary at the top, the first thing a recruiter reads.",
    "Add a 2–3 sentence summary that names the role you want and your strongest matching skills.",
  );
}

const REQUIRED_SECTIONS: ReadonlyArray<[SectionKind, string]> = [
  ["experience", "Experience"],
  ["education", "Education"],
  ["skills", "Skills"],
];

const RENAMES: ReadonlyArray<[RegExp, string]> = [
  [/journey|career|been|path|roles|work|employ|history/i, "Work Experience"],
  [/know|toolbox|stack|tools|tech|abilit|strength/i, "Skills"],
  [/school|stud|learn|academ|train/i, "Education"],
  [/about|who|me\b|intro|profile/i, "Summary"],
  [/built|made|portfolio|samples|creat/i, "Projects"],
];

function sectionHeadings({ resume }: SearchabilityInput): SearchabilityCheck {
  const label = "Section headings";
  const kinds = new Set(resume.sections.map((s) => s.kind));
  const missing = REQUIRED_SECTIONS.filter(([kind]) => !kinds.has(kind)).map(([, name]) => name);
  const creative = resume.sections.filter((s) => s.kind === null);
  const renames = creative.map((s) => `"${s.heading}" → "${RENAMES.find(([re]) => re.test(s.heading))?.[1] ?? "a standard name"}"`);

  if (!kinds.has("experience")) {
    const detail =
      creative.length > 0
        ? `No standard "Experience" heading. An ATS won't recognize ${creative.map((s) => `"${s.heading}"`).join(", ")}.`
        : 'No "Experience" heading was found, so an ATS can\'t tell where your jobs are.';
    return fail("section-headings", label, detail, renames.length > 0 ? `Rename: ${renames.join("; ")}.` : 'Put your jobs under a heading named "Work Experience".');
  }
  if (missing.length > 0 || creative.length > 0) {
    const parts = [
      ...(missing.length > 0 ? [`No ${missing.map((m) => `"${m}"`).join(" or ")} heading was found.`] : []),
      ...(creative.length > 0 ? [`${creative.map((s) => `"${s.heading}"`).join(", ")} may not be recognized.`] : []),
    ];
    const fixes = [
      ...(renames.length > 0 ? [`Rename ${renames.join("; ")}.`] : []),
      ...(missing.length > 0 ? [`Add ${missing.map((m) => `"${m}"`).join(" and ")} with standard names.`] : []),
    ];
    return warn("section-headings", label, parts.join(" "), fixes.join(" "));
  }
  return pass("section-headings", label, "Experience, Education, and Skills all use headings an ATS recognizes.");
}

function dateFormat({ resume }: SearchabilityInput): SearchabilityCheck {
  const label = "Date format";
  const scoped = [sectionText(resume, "experience"), sectionText(resume, "education")].filter((t) => t !== null);
  const dates = findDates(scoped.length > 0 ? scoped.join("\n") : resume.text);
  if (dates.length === 0) {
    return fail("date-format", label, "No dates were found, so an ATS can't work out how long you held each role.", 'Give every role a start and end date, e.g. "Jan 2021 – Present".');
  }
  const styles = dateStyles(dates);
  const unclear = dates.filter((d) => d.style === "Season YYYY" || d.style === "Mon 'YY");
  if (unclear.length > 0) {
    return warn(
      "date-format",
      label,
      `${unclear.map((d) => `"${d.text}"`).join(", ")} may not parse as a date.`,
      'Write a month and a four-digit year, e.g. "Jun 2020".',
    );
  }
  if (styles.length > 1) {
    const examples = styles.map((style) => `"${dates.find((d) => d.style === style)!.text}"`);
    return warn("date-format", label, `Dates mix ${styles.length} styles: ${examples.join(", ")}.`, `Pick one style and use it everywhere, e.g. ${examples[0]}.`);
  }
  if (styles[0] === "YYYY") {
    return warn("date-format", label, "Dates show years only, which hides how long each role lasted.", 'Add months, e.g. "Mar 2019 – Aug 2022".');
  }
  return pass("date-format", label, `All ${dates.length} dates use one readable style, e.g. "${dates[0].text}".`);
}

const DEGREE_NAMES: Record<Degree, string> = {
  high_school: "high school diploma",
  associate: "associate degree",
  bachelor: "bachelor's degree",
  master: "master's degree",
  doctorate: "doctorate",
};

/** Spelled-out names match anywhere; abbreviations like "BS" or "MA" only inside an Education section. */
const DEGREE_FORMS: ReadonlyArray<[Degree, RegExp, RegExp | null]> = [
  ["doctorate", /\b(ph\.?\s?d|doctorate|doctor of|d\.?phil)\b/i, null],
  ["master", /\b(master'?s?|mba|m\.?eng|m\.?tech)\b/i, /(?<![A-Za-z])(M\.?Sc?\.?|M\.A\.|MS|MA|MCA|MPH|MFA|LLM|M\.?Ed\.?)(?![A-Za-z])/],
  ["bachelor", /\b(bachelor'?s?|b\.?tech|b\.?eng|undergraduate degree)\b/i, /(?<![A-Za-z])(B\.?Sc?\.?|B\.A\.|BA|B\.E\.|BE|BCA|BBA|B\.?Com|LLB)(?![A-Za-z])/],
  ["associate", /\bassociate'?s? (degree|of)\b/i, /(?<![A-Za-z])(A\.A\.S?|A\.S\.|AAS)(?![A-Za-z])/],
  ["high_school", /\b(high school|secondary school|GED)\b/i, null],
];

export function resumeDegree(resume: ResumeModel): Degree | null {
  const education = sectionText(resume, "education");
  const text = education ?? resume.text;
  for (const [degree, spelled, short] of DEGREE_FORMS) {
    if (spelled.test(text) || (education !== null && short?.test(education))) return degree;
  }
  return null;
}

function educationMatch({ resume, job, match }: SearchabilityInput): SearchabilityCheck | null {
  const required = job.education;
  if (!required) return null;
  const label = "Education";
  const have = resumeDegree(resume);
  const need = DEGREE_NAMES[required.degree];
  const inFields = required.fields.length > 0 ? ` in ${required.fields.join(" or ")}` : "";
  const meets = have !== null && DEGREES.indexOf(have) >= DEGREES.indexOf(required.degree);

  if (meets) {
    const educationText = sectionText(resume, "education") ?? resume.text;
    const fieldFound =
      required.fields.length === 0 ||
      required.fields.some((f) => matchTerm(f, { ...match, resumeText: educationText }).status !== "missing");
    if (fieldFound) return pass("education-match", label, `Your ${DEGREE_NAMES[have]} meets the ${need}${inFields} the posting asks for.`);
    return warn(
      "education-match",
      label,
      `Your ${DEGREE_NAMES[have]} meets the level, but the posting asks for it${inFields}.`,
      `If your degree, minor, or coursework covers ${required.fields.join(" or ")}, name it in your Education section.`,
    );
  }
  if (required.equivalentExperience) {
    return warn(
      "education-match",
      label,
      `The posting asks for a ${need}${inFields} or equivalent experience, and your resume doesn't show the degree.`,
      "Make your years of relevant experience easy to spot in your summary.",
    );
  }
  return fail(
    "education-match",
    label,
    `The posting asks for a ${need}${inFields}, and your resume doesn't show one.`,
    "If you have it, list it under an \"Education\" heading with the degree spelled out, e.g. \"Bachelor of Science in Computer Science\".",
  );
}

const SENIORITY_WORDS = /\b(senior|sr|junior|jr|lead|principal|staff|associate|entry[- ]level|mid[- ]level|intern|i{1,3}|iv|[1-4])\b\.?/gi;

/** The title without team, location, or requisition suffixes: "Senior Engineer - Payments (Remote)" → "Senior Engineer". */
function cleanTitle(title: string): string {
  return title.replace(/\([^)]*\)/g, " ").split(/\s[-–—|]\s|,|\s\/\s/)[0].replace(/\s+/g, " ").trim();
}

export function jobTitleMatch({ resume, job }: SearchabilityInput): SearchabilityCheck {
  const label = "Job title";
  const title = cleanTitle(job.title);
  if (formPattern(title).test(resume.text)) {
    return pass("job-title-match", label, `Your resume uses the posting's title, "${title}". Recruiters search by title first.`);
  }
  const core = title.replace(SENIORITY_WORDS, " ").replace(/\s+/g, " ").trim();
  const fix = `If it's accurate, use the exact title "${title}" in your summary or headline.`;
  if (core && core !== title && formPattern(core).test(resume.text)) {
    return warn("job-title-match", label, `Your resume says "${core}", but the posting's title is "${title}".`, fix);
  }
  return fail("job-title-match", label, `The posting's title, "${title}", isn't anywhere in your resume. Recruiters search by title first.`, fix);
}

function fileType({ file }: SearchabilityInput): SearchabilityCheck | null {
  if (!file) return null;
  const label = "File type";
  switch (file.format) {
    case "docx":
      return pass("file-type", label, "A .docx file is the format ATS read most reliably.");
    case "pdf":
      return file.hasTextLayer
        ? pass("file-type", label, "A text-based PDF reads well in most ATS. Use .docx when a posting asks for Word.")
        : fail(
            "file-type",
            label,
            "This PDF is a picture of text, so an ATS sees a blank page.",
            "Export the PDF from Word or Google Docs instead of scanning it, or upload the .docx.",
          );
    case "other": {
      const ext = `.${file.extension}`;
      return ["doc", "rtf", "txt"].includes(file.extension)
        ? warn("file-type", label, `${ext} files read in many ATS but lose formatting or fail in some.`, "Save it as .docx and upload that.")
        : fail("file-type", label, `Most ATS can't read ${ext} files.`, "Save it as .docx (or a text-based PDF) and upload that.");
    }
  }
}

export function searchabilityChecks(input: SearchabilityInput): SearchabilityCheck[] {
  return [
    contactName(input),
    contactEmail(input),
    contactPhone(input),
    contactLinkedIn(input),
    summary(input),
    sectionHeadings(input),
    dateFormat(input),
    educationMatch(input),
    jobTitleMatch(input),
    fileType(input),
  ].filter((c) => c !== null);
}
