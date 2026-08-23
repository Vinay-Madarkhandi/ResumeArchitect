export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
export const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
export const URL_RE = /(https?:\/\/[^\s,;]+)|(\bwww\.[^\s,;]+)|(\b[a-z0-9-]+\.(?:com|dev|io|me|org|net)\/[^\s,;]+)/i;

const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
const DATE_TOKEN = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
export const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|[Pp]resent|[Cc]urrent)`,
);
export const DATE_SINGLE_RE = new RegExp(`^${DATE_TOKEN}$`);
const MONTH_YEAR_ANYWHERE_RE = new RegExp(`${MONTH}\\s+\\d{4}`);

/**
 * Whether a line carries any date signal — a full range ("Nov 2025 - Jan
 * 2026") or a single month+year stamp ("Feb 2026", common on project
 * headers that show only a start month). Used to tell a new entry's header
 * apart from a wrapped continuation even when the two happen to share a
 * font size.
 */
export function looksLikeDateBoundary(text: string): boolean {
  return DATE_RANGE_RE.test(text) || MONTH_YEAR_ANYWHERE_RE.test(text);
}

export const BULLET_PREFIX_RE = /^[•\-\*▪◦‣·○]\s*/;

export function stripBulletPrefix(line: string): string {
  return line.replace(BULLET_PREFIX_RE, "").trim();
}

export function looksLikeBullet(line: string): boolean {
  return BULLET_PREFIX_RE.test(line);
}

/**
 * Whether two lines are likely the same visual text run (e.g. a bullet or
 * title that wrapped onto a second PDF line), based on font size rather than
 * text length — a wrapped continuation can be short ("workflows") or long,
 * but it always renders at the same font size as the line it continues.
 * Missing/zero font-size metadata (some PDFs don't expose it) defaults to
 * "similar" since assuming a wrap is the safer failure mode than fragmenting
 * a single entry into several.
 */
export function isSimilarFontSize(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return true;
  const ratio = a / b;
  return ratio > 0.85 && ratio < 1.18;
}

export const SECTION_HEADER_KEYWORDS: Record<
  "summary" | "experience" | "education" | "skills" | "projects" | "certifications",
  string[]
> = {
  summary: ["summary", "professional summary", "objective", "profile", "about", "about me", "career objective"],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "employment",
    "work history",
    "career history",
    "relevant experience",
  ],
  education: ["education", "academic background", "education & training", "education and training"],
  skills: ["skills", "technical skills", "core competencies", "skills & tools", "competencies", "technologies"],
  projects: ["projects", "personal projects", "academic projects", "key projects", "selected projects"],
  certifications: [
    "certifications",
    "certificates",
    "licenses & certifications",
    "certifications & licenses",
    "licenses",
    "licenses and certifications",
  ],
};

export type SectionKind = keyof typeof SECTION_HEADER_KEYWORDS;

export function matchSectionHeader(line: string): SectionKind | null {
  const normalized = line
    .toLowerCase()
    .trim()
    .replace(/:$/, "")
    .replace(/\s+/g, " ");
  if (normalized.length > 45) return null;
  for (const [kind, keywords] of Object.entries(SECTION_HEADER_KEYWORDS) as [SectionKind, string[]][]) {
    if (keywords.some((k) => normalized === k || normalized.startsWith(k + " "))) {
      return kind;
    }
  }
  return null;
}
