import type { JobFacts, JobLevel } from "@/lib/schemas/jobFacts";
import { findDates, findRanges, yearsCovered } from "./dates";
import { fail, pass, warn, type Check, type RecruiterTipId } from "./report";
import { findEmail, findLinkedIn, findName, findPhone, sectionText, webProfiles, wordCount, type ResumeModel, type SectionKind } from "./resume";

/** What a recruiter notices in the first skim (docs/research/jobscan.md §3.5). */

type RecruiterTip = Check<RecruiterTipId>;

export interface RecruiterTipsInput {
  resume: ResumeModel;
  job: JobFacts;
  jobText: string;
  asOf: Date;
}

/** Sections whose lines describe what you did, as opposed to lists of skills or schools. */
const ACHIEVEMENT_SECTIONS = new Set<SectionKind | null>(["experience", "projects", "volunteer", "awards", "summary", null]);

const NOT_A_METRIC = [
  /[\w.+-]+@[\w.-]+/g,
  /\b(https?:\/\/|www\.)\S+/g,
  /\+?\(?\d[\d\s().-]{8,}\d/g,
  /\b[A-Za-z]+\d[\w]*/g,
  /\b(19|20)\d{2}\b/g,
];
const METRIC_WORDS = /\b(doubled|tripled|quadrupled|halved)\b/i;

export function hasMetric(line: string): boolean {
  let text = line;
  for (const d of findDates(line).reverse()) text = text.slice(0, d.start) + text.slice(d.end);
  for (const re of NOT_A_METRIC) text = text.replace(re, " ");
  return /\d/.test(text) || METRIC_WORDS.test(text);
}

function measurableResults({ resume }: RecruiterTipsInput): RecruiterTip {
  const label = "Measurable results";
  // A headingless resume keeps every bullet before the first heading, so count those lines too.
  const name = findName(resume);
  const untitled = resume.header.filter((u) =>
    u.text !== name && !findEmail(u.text) && !findPhone(u.text) && !findLinkedIn({ text: u.text, links: [] }),
  );
  const lines = [...untitled, ...resume.sections.filter((s) => ACHIEVEMENT_SECTIONS.has(s.kind)).flatMap((s) => s.units)]
    .filter((u) => u.kind !== "heading");
  const measured = lines.filter((u) => hasMetric(u.text)).length;
  const detail = `${measured} of your ${lines.length} achievement lines ${measured === 1 ? "includes" : "include"} a number.`;
  const fix = 'Put numbers in your strongest bullets: how much, how many, how fast, e.g. "cut deploy time 40%".';
  if (measured >= 5) return pass("measurable-results", label, `${detail} Numbers make results believable at a glance.`);
  if (measured >= 2) return warn("measurable-results", label, `${detail} Aim for at least 5.`, fix);
  return fail("measurable-results", label, `${detail} Recruiters skim for numbers.`, fix);
}

const LEVEL_NAMES: Record<JobLevel, string> = { entry: "entry-level", mid: "mid-level", senior: "senior", executive: "executive" };

/** Words that read as complete without padding, by career level (docs/research/jobscan.md §3.5). */
const WORD_RANGES: Record<JobLevel, [number, number]> = {
  entry: [400, 600],
  mid: [600, 800],
  senior: [800, 1100],
  executive: [800, 1300],
};

function wordCountTip({ resume, job }: RecruiterTipsInput): RecruiterTip {
  const label = "Word count";
  const words = wordCount(resume.text);
  const [min, max] = WORD_RANGES[job.level];
  const detail = `Your resume has ${words} words. For a ${LEVEL_NAMES[job.level]} role, ${min}–${max} reads as complete without padding.`;
  if (words >= min && words <= max) return pass("word-count", label, detail);
  const fix =
    words < min
      ? "Add detail to your most relevant roles: scope, tools, and results."
      : `Trim older roles and repeated bullets toward ${max} words.`;
  return words < 200 || words > 1500 ? fail("word-count", label, detail, fix) : warn("word-count", label, detail, fix);
}

/** Clichés recruiters skim past, each with what to write instead. */
const WORDS_TO_AVOID: ReadonlyArray<[RegExp, string, string]> = [
  [/\bresponsible for\b/i, "responsible for", "a verb that shows what you did: led, owned, built"],
  [/\bduties included\b/i, "duties included", "the result you delivered"],
  [/\bworked on\b/i, "worked on", "built, shipped, or improved"],
  [/\bhelped (with|to)\b/i, "helped with", "your exact part: drafted, tested, negotiated"],
  [/\bteam player\b/i, "team player", "something you achieved with others"],
  [/\bhard[- ]?work(er|ing)\b/i, "hard worker", "a result that shows the effort"],
  [/\bdetail[- ]oriented\b/i, "detail-oriented", 'an example, e.g. "audited 400 invoices with zero errors"'],
  [/\bgo[- ]getter\b/i, "go-getter", "an initiative you started and its outcome"],
  [/\bself[- ]starter\b/i, "self-starter", "something you started without being asked"],
  [/\bsynergy\b/i, "synergy", "the specific joint outcome"],
  [/\bthink(ing)? outside the box\b/i, "think outside the box", "the new approach you took"],
  [/\bresults[- ](driven|oriented)\b/i, "results-driven", "the results themselves"],
  [/\bproven track record\b/i, "proven track record", "the record: numbers and outcomes"],
  [/\bexcellent communication skills\b/i, "excellent communication skills", "a time you presented, wrote, or negotiated"],
  [/\bhighly motivated\b/i, "highly motivated", "what you did because you were motivated"],
  [/\bpassionate about\b/i, "passionate about", "what you built or learned out of that interest"],
  [/\bbest of breed\b/i, "best of breed", "the measurable edge"],
  [/\bgo[- ]to person\b/i, "go-to person", "what people came to you for, and how often"],
  [/\bseasoned\b/i, "seasoned", "your years of experience as a number"],
  [/\b(rock ?star|ninja|guru)\b/i, "rockstar / ninja / guru", "your actual title and a result"],
  [/\breferences (are )?available (up)?on request\b/i, "references available upon request", "nothing: delete the line"],
];

function wordsToAvoid({ resume, jobText }: RecruiterTipsInput): RecruiterTip {
  const label = "Words to avoid";
  // A phrase the posting itself uses may be an ATS search term, so it stays.
  const found = WORDS_TO_AVOID.filter(([re]) => re.test(resume.text) && !re.test(jobText));
  if (found.length === 0) return pass("words-to-avoid", label, "No overused clichés. Your lines speak in specifics.");
  const names = found.map(([, name]) => `"${name}"`).join(", ");
  const fix = `Replace them: ${found
    .slice(0, 3)
    .map(([, name, instead]) => `"${name}" → ${instead}`)
    .join("; ")}.`;
  const detail = `Found ${names}. Recruiters skim past these.`;
  return found.length >= 4 ? fail("words-to-avoid", label, detail, fix) : warn("words-to-avoid", label, detail, fix);
}

function webPresence({ resume }: RecruiterTipsInput): RecruiterTip {
  const label = "Web presence";
  const profiles = webProfiles(resume.contact);
  if (profiles.length > 0) return pass("web-presence", label, `Recruiters can look you up: ${profiles.join(", ")}.`);
  return fail(
    "web-presence",
    label,
    "No LinkedIn, portfolio, or other profile link. Most recruiters look candidates up before calling.",
    "Add your LinkedIn URL, plus a GitHub or portfolio link if your field uses one.",
  );
}

/** Typical years of experience per level, when the posting gives no number. */
const LEVEL_YEARS: Record<JobLevel, [number, number]> = {
  entry: [0, 3],
  mid: [2, 8],
  senior: [5, Infinity],
  executive: [10, Infinity],
};

function jobLevelMatch({ resume, job, asOf }: RecruiterTipsInput): RecruiterTip {
  const label = "Job level match";
  const experience = sectionText(resume, "experience") ?? resume.text.replace(sectionText(resume, "education") ?? "", "");
  const ranges = findRanges(experience, asOf);
  if (ranges.length === 0) {
    return warn(
      "job-level-match",
      label,
      "Your experience has no date ranges, so a recruiter can't tell your level.",
      'Give each role a start and end date, e.g. "Mar 2021 – Present".',
    );
  }
  const years = yearsCovered(ranges);
  const level = LEVEL_NAMES[job.level];
  const [min, max] = job.yearsRequired !== null ? [job.yearsRequired, job.yearsRequired + 10] : LEVEL_YEARS[job.level];
  const asks = job.yearsRequired !== null ? `asks for ${job.yearsRequired}+ years` : `is ${level}`;
  const detail = `Your dates add up to about ${years} years of experience; the posting ${asks}.`;
  if (years < min) {
    const fix = "If you have relevant experience your dates don't show (freelance, research, internships), add it with dates.";
    return job.yearsRequired !== null && years < min - 1
      ? fail("job-level-match", label, detail, fix)
      : warn("job-level-match", label, detail, fix);
  }
  if (years > max && (job.level === "entry" || job.level === "mid")) {
    return warn(
      "job-level-match",
      label,
      `${detail} You may read as overqualified for a ${level} role.`,
      "Lead with your most relevant recent work and trim older roles.",
    );
  }
  return pass("job-level-match", label, detail);
}

export function recruiterTips(input: RecruiterTipsInput): RecruiterTip[] {
  return [measurableResults(input), wordCountTip(input), wordsToAvoid(input), webPresence(input), jobLevelMatch(input)];
}
