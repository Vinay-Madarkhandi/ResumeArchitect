import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { Check, KeywordHit, LinkedInProfile, LinkedInReport } from "@/lib/schemas/career";
import { keywordRatio, matchKeywords } from "./keywords";
import { hasMeasurableResult, share, weightedScore, wordCount } from "./score";

/** LinkedIn's own limits and the ranges recruiters' advice converges on. */
export const LINKEDIN = {
  headlineMax: 220,
  headlineMin: 70,
  aboutMax: 2_600,
  aboutMin: 1_000,
  /** Roughly what shows before "…see more" on desktop. */
  aboutPreview: 265,
  skillsMin: 5,
  skillsMax: 100,
} as const;

export const SECTION_LABELS = { headline: "Headline", about: "About", experience: "Experience", skills: "Skills" } as const;

export function parseSkills(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[\n,;•·|]+/)
    .map((s) => s.replace(/^[-*\s]+/, "").trim())
    .filter((s) => s.length > 0 && s.length <= 80)
    .filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

/** Lines of the experience section that describe work, not titles or date lines. */
function experienceLines(text: string): string[] {
  return text.split("\n").map((l) => l.replace(/^[-*•·\s]+/, "").trim()).filter((l) => wordCount(l) >= 6);
}

const PROFILE_URL = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#\s]+)\/?(?:[?#].*)?$/i;

/** LinkedIn's generated slugs end in a run of digits or a hash: "ada-lovelace-1a2b3c4d", "ada-lovelace-123456789". */
export function customUrlStatus(url: string): "missing" | "invalid" | "default" | "custom" {
  if (!url.trim()) return "missing";
  const slug = PROFILE_URL.exec(url.trim())?.[1];
  if (!slug) return "invalid";
  const last = slug.split("-").at(-1) ?? "";
  return slug.includes("-") && /\d/.test(last) && last.length >= 5 ? "default" : "custom";
}

const DEFAULT_HEADLINE = /^[^|•·,/]+\s+at\s+[^|•·,/]+$/i;

function profileChecks(profile: LinkedInProfile, target: { keywords: KeywordHit[]; preview: KeywordHit[] } | null): Check[] {
  const headline = profile.headline.trim();
  const about = profile.about.trim();
  const skills = parseSkills(profile.skills);
  const lines = experienceLines(profile.experience);
  const measured = lines.filter(hasMeasurableResult).length;
  const url = customUrlStatus(profile.url);

  const checks: Check[] = [
    {
      id: "headline_length",
      label: "Headline length",
      passed: headline.length >= LINKEDIN.headlineMin && headline.length <= LINKEDIN.headlineMax,
      detail: !headline
        ? "No headline. It's the line recruiters see next to your name in every search result."
        : headline.length > LINKEDIN.headlineMax
          ? `${headline.length} characters. LinkedIn cuts headlines at ${LINKEDIN.headlineMax}.`
          : headline.length < LINKEDIN.headlineMin
            ? `${headline.length} characters. Use more of the ${LINKEDIN.headlineMax} available for your specialties.`
            : `${headline.length} of ${LINKEDIN.headlineMax} characters.`,
    },
    {
      id: "headline_default",
      label: "Headline beyond \"Title at Company\"",
      passed: !!headline && !DEFAULT_HEADLINE.test(headline),
      detail: !headline
        ? "Add a headline."
        : DEFAULT_HEADLINE.test(headline)
          ? "This looks like LinkedIn's default. Add the skills and domain you want to be found for."
          : "Says more than your current job title.",
    },
    {
      id: "about_length",
      label: "About section length",
      passed: about.length >= LINKEDIN.aboutMin && about.length <= LINKEDIN.aboutMax,
      detail: !about
        ? "No About section. It's the most keyword-dense part of a profile recruiters read."
        : about.length > LINKEDIN.aboutMax
          ? `${about.length} characters. LinkedIn allows ${LINKEDIN.aboutMax.toLocaleString("en-US")}.`
          : about.length < LINKEDIN.aboutMin
            ? `${about.length} characters. Aim for at least ${LINKEDIN.aboutMin.toLocaleString("en-US")}: what you do, for whom, and proof.`
            : `${about.length.toLocaleString("en-US")} of ${LINKEDIN.aboutMax.toLocaleString("en-US")} characters.`,
    },
    {
      id: "skills_count",
      label: "Skills listed",
      passed: skills.length >= LINKEDIN.skillsMin && skills.length <= LINKEDIN.skillsMax,
      detail: skills.length < LINKEDIN.skillsMin
        ? `${skills.length} skill${skills.length === 1 ? "" : "s"}. List at least ${LINKEDIN.skillsMin}; recruiters filter searches by them.`
        : skills.length > LINKEDIN.skillsMax
          ? `${skills.length} skills. LinkedIn keeps ${LINKEDIN.skillsMax}.`
          : `${skills.length} skills. Pin the three that matter most for your target role.`,
    },
    {
      id: "experience_detail",
      label: "Experience is described",
      passed: lines.length >= 3,
      detail: lines.length >= 3
        ? `${lines.length} lines describe your work.`
        : "Add a few lines under each role on what you did and what changed because of it.",
    },
    {
      id: "experience_measurable",
      label: "Measurable results",
      passed: lines.length > 0 && measured / lines.length >= 0.3,
      detail: lines.length === 0
        ? "No experience lines to measure."
        : `${measured} of ${lines.length} experience lines include a number. Aim for about a third.`,
    },
    {
      id: "custom_url",
      label: "Custom profile URL",
      passed: url === "custom",
      detail: {
        missing: "Paste your profile URL to check it.",
        invalid: "That isn't a linkedin.com/in/ profile address.",
        default: "This is LinkedIn's generated address. Set a custom one under \"Edit public profile & URL\".",
        custom: "Uses a clean, custom address.",
      }[url],
    },
  ];

  if (target) {
    const { keywords } = target;
    const inHeadline = keywords.filter((k) => k.where.includes("headline"));
    const previewHits = target.preview.filter((k) => k.found);
    const mustSkills = keywords.filter((k) => k.kind === "must");
    const listed = mustSkills.filter((k) => k.where.includes("skills"));
    checks.push(
      {
        id: "headline_keywords",
        label: "Target keywords in headline",
        passed: inHeadline.length >= 2,
        detail: inHeadline.length
          ? `Has ${inHeadline.map((k) => k.term).join(", ")}. Recruiter search weighs the headline heavily; aim for two or more.`
          : "None of the role's keywords are in your headline.",
      },
      {
        id: "about_hook",
        label: "Keyword before \"see more\"",
        passed: previewHits.length > 0,
        detail: previewHits.length
          ? `The first lines mention ${previewHits.map((k) => k.term).join(", ")}.`
          : `Readers see about ${LINKEDIN.aboutPreview} characters before "see more". Lead with what the role needs.`,
      },
      {
        id: "skills_target",
        label: "Must-haves in Skills",
        passed: mustSkills.length > 0 && listed.length / mustSkills.length >= 0.75,
        detail: mustSkills.length === 0
          ? "The target lists no must-haves."
          : `${listed.length} of ${mustSkills.length} must-haves are in your Skills section.`,
      },
    );
  }
  return checks;
}

export function reviewLinkedIn(profile: LinkedInProfile, job: JobAnalysis | null): LinkedInReport {
  const keywords = job
    ? matchKeywords(job, { headline: profile.headline, about: profile.about, experience: profile.experience, skills: profile.skills })
    : null;
  const preview = job ? matchKeywords(job, { preview: profile.about.slice(0, LINKEDIN.aboutPreview) }) : [];
  const checks = profileChecks(profile, keywords ? { keywords, preview } : null);
  const score = weightedScore([
    {
      id: "keywords",
      label: "Target keywords",
      base: 0.4,
      ratio: keywords ? keywordRatio(keywords) : null,
      detail: keywords ? `${keywords.filter((k) => k.found).length} of ${keywords.length} found on your profile` : "",
    },
    {
      id: "checks",
      label: "Profile checks",
      base: 0.6,
      ratio: share(checks, (c) => c.passed),
      detail: `${checks.filter((c) => c.passed).length} of ${checks.length} checks pass`,
    },
  ]);
  return { score, checks, keywords };
}
