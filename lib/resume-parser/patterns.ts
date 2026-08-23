export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
export const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
export const URL_RE = /(https?:\/\/[^\s,;]+)|(\bwww\.[^\s,;]+)|(\b[a-z0-9-]+\.(?:com|dev|io|me|org|net)\/[^\s,;]+)/i;

const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
const DATE_TOKEN = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
export const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|[Pp]resent|[Cc]urrent)`,
);
export const DATE_SINGLE_RE = new RegExp(`^${DATE_TOKEN}$`);

export const BULLET_PREFIX_RE = /^[•\-\*▪◦‣·○]\s*/;

export function stripBulletPrefix(line: string): string {
  return line.replace(BULLET_PREFIX_RE, "").trim();
}

export function looksLikeBullet(line: string): boolean {
  return BULLET_PREFIX_RE.test(line);
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
