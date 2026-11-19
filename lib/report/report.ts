import type { DocumentContent } from "@/lib/schemas/document";
import type { Importance, JobFacts } from "@/lib/schemas/jobFacts";

/**
 * The Match Report: how one version of a resume measures up against one job
 * posting, section by section, the way Jobscan's premium report does
 * (docs/research/jobscan.md §3). Gemini reads the posting once and returns
 * `JobFacts`; everything in this report is computed from those facts by
 * deterministic code, so the same resume always gets the same number and the
 * number moves live while the user edits.
 */

export type SkillStatus = "found" | "synonym" | "missing";

/** How a term shows up in the resume. */
export type TermMatch =
  | {
      status: "found";
      /** Mentions of the term and its synonyms. */
      resumeCount: number;
      /** The term as the resume writes it. */
      matchedForm: string;
      /** Advice on wording or excessive repetition. */
      advice: string | null;
    }
  | {
      status: "synonym";
      resumeCount: number;
      /** The synonym the resume uses instead of the job's wording. */
      matchedForm: string;
      advice: string;
    }
  | { status: "missing"; resumeCount: 0; matchedForm: null; advice: null };

export type SkillMatch = TermMatch & {
  term: string;
  importance: Importance;
  /** Mentions of the term and its synonyms in the job posting, at least 1. */
  jdCount: number;
};

/** A skill the posting never names but the role usually needs (§10). */
export type PredictedSkillMatch = TermMatch & { term: string; reason: string };

export type CheckStatus = "pass" | "warn" | "fail";

export type Check<Id extends string = CheckId> = {
  id: Id;
  label: string;
  /** One sentence the user understands without knowing what an ATS is. */
  detail: string;
} & ({ status: "pass"; fix: null } | { status: "warn" | "fail"; fix: string });

export type SearchabilityCheckId =
  | "contact-name"
  | "contact-email"
  | "contact-phone"
  | "contact-linkedin"
  | "summary"
  | "section-headings"
  | "date-format"
  | "education-match"
  | "job-title-match"
  | "file-type";

export type FormattingCheckId =
  | "tables"
  | "header-footer"
  | "images"
  | "columns"
  | "text-boxes"
  | "fonts"
  | "special-characters"
  | "section-heading-names";

export type RecruiterTipId =
  | "measurable-results"
  | "word-count"
  | "words-to-avoid"
  | "web-presence"
  | "job-level-match";

export type CheckId = SearchabilityCheckId | FormattingCheckId | RecruiterTipId;

export type ComponentId =
  | "hardSkills"
  | "jobTitle"
  | "softSkills"
  | "otherKeywords"
  | "education"
  | "searchability"
  | "formatting"
  | "recruiterTips"
  | "predictedSkills";

/** One slice of the match rate, so every point traces to a section. */
export interface ScoreComponent {
  id: ComponentId;
  label: string;
  /** Share of the match rate, 0–1, after empty components hand theirs to the rest. */
  weight: number;
  /** How much of this component the resume earns, 0–1. */
  ratio: number;
  /** Points contributed to the match rate. */
  points: number;
}

export interface MatchReport {
  /** 0–100. */
  matchRate: number;
  verdict: { target: number; reached: boolean; message: string };
  breakdown: ScoreComponent[];
  hardSkills: SkillMatch[];
  softSkills: SkillMatch[];
  otherKeywords: SkillMatch[];
  searchability: Check<SearchabilityCheckId>[];
  formatting: Check<FormattingCheckId>[];
  recruiterTips: Check<RecruiterTipId>[];
  predictedSkills: PredictedSkillMatch[];
}

/**
 * What a file inspector can see that the resume text can't: layout an ATS
 * may misread. `null` means the format can't tell (a PDF has no Word tables
 * or headers), and the matching check is left out rather than guessed.
 */
export interface LayoutFacts {
  tables: number | null;
  images: number;
  textBoxes: number | null;
  /** Most text columns on any page or section; 1 for a single-column layout. */
  columns: number;
  headerText: string | null;
  footerText: string | null;
  /** Font families the text is set in, symbol fonts excluded. */
  fonts: string[];
  /** Distinct bullet glyphs, as they render. */
  bulletChars: string[];
}

export type FileInspectionFailure = {
  format: "invalid";
  extension: "docx" | "pdf";
  reason: "too-large" | "unreadable";
};

export type ResumeFileFacts =
  | ({ format: "docx" } & LayoutFacts)
  | ({ format: "pdf"; /** False when the PDF lacks usable selectable text. */ hasTextLayer: boolean } & LayoutFacts)
  | FileInspectionFailure
  | { format: "other"; /** Lower-case, without the dot ("pages", "png"). */ extension: string };

export interface ReportInput {
  job: JobFacts;
  /** The posting as the user pasted it; keyword frequency is counted here. */
  jobText: string;
  resume: DocumentContent;
  /** Null when the resume was pasted or written in the editor. */
  file: ResumeFileFacts | null;
  /** "Present" in a date range means this day. */
  asOf: Date;
}

export function pass<Id extends string>(id: Id, label: string, detail: string): Check<Id> {
  return { id, label, status: "pass", detail, fix: null };
}

export function warn<Id extends string>(id: Id, label: string, detail: string, fix: string): Check<Id> {
  return { id, label, status: "warn", detail, fix };
}

export function fail<Id extends string>(id: Id, label: string, detail: string, fix: string): Check<Id> {
  return { id, label, status: "fail", detail, fix };
}
