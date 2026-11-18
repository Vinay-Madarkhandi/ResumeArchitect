import type { Importance } from "@/lib/schemas/jobFacts";
import { formattingChecks } from "./formatting";
import { matchPredictedSkills, matchSkills, type MatchContext } from "./keywords";
import { recruiterTips } from "./recruiterTips";
import type { Check, CheckStatus, ComponentId, MatchReport, ReportInput, ScoreComponent, SkillMatch, TermMatch } from "./report";
import { readResume } from "./resume";
import { searchabilityChecks } from "./searchability";
import { buildLexicon } from "./synonyms";

/**
 * Share of the match rate each part of the report carries. Jobscan doesn't
 * publish its weights; docs/research/jobscan.md §15 collects the estimates:
 *
 * | Component        | Weight | §15 estimate                                   |
 * |------------------|--------|------------------------------------------------|
 * | hard skills      | 45%    | 40–50%, "most heavily weighted"                |
 * | job title        | 15%    | 15–20%                                         |
 * | soft skills      | 10%    | 10–15%                                         |
 * | education        | 5%     | 5–10%                                          |
 * | formatting       | 5%     | ~5%                                            |
 * | predicted skills | 5%     | §10: "less weight than explicitly listed"      |
 * | searchability    | 10%    | the remaining 15%, which §15 calls "other"     |
 * | recruiter tips   | 5%     |   and §3 fills with parse and recruiter checks |
 *
 * Hard skills take the middle of their range and the rest the low end, so
 * the parts sum to 100%.
 * A part with nothing to measure (no soft skills in the posting, no degree
 * asked for) hands its weight to the rest in proportion.
 */
export const WEIGHTS: Readonly<Record<ComponentId, number>> = {
  hardSkills: 0.45,
  jobTitle: 0.15,
  softSkills: 0.1,
  education: 0.05,
  searchability: 0.1,
  formatting: 0.05,
  recruiterTips: 0.05,
  predictedSkills: 0.05,
};

const LABELS: Record<ComponentId, string> = {
  hardSkills: "Hard skills",
  jobTitle: "Job title",
  softSkills: "Soft skills",
  education: "Education",
  searchability: "Searchability",
  formatting: "Formatting",
  recruiterTips: "Recruiter tips",
  predictedSkills: "Predicted skills",
};

/** The match rate Jobscan recommends reaching before applying (§2, §15). */
export const TARGET_MATCH_RATE = 75;

/** Required skills count about twice a preferred one (§15, "predicted importance"). */
const IMPORTANCE_WEIGHT: Record<Importance, number> = { high: 2, medium: 1.5, low: 1 };

/** A skill the posting repeats matters more, with diminishing returns: ×1, ×1.5, ×1.8, ×2 from 1 to 4+ mentions. */
function frequencyWeight(jdCount: number): number {
  return 1 + Math.log2(Math.min(jdCount, 4)) / 2;
}

/** A synonym earns 75% of an exact match (§15: 70–80%). */
const SYNONYM_CREDIT = 0.75;
/** One mention of a skill the posting repeats earns partial credit; two or more earn full (§15). */
const SINGLE_MENTION_CREDIT = 0.85;

function termCredit(match: TermMatch, jdCount = 1): number {
  switch (match.status) {
    case "found":
      return match.resumeCount >= Math.min(jdCount, 2) ? 1 : SINGLE_MENTION_CREDIT;
    case "synonym":
      return SYNONYM_CREDIT;
    case "missing":
      return 0;
  }
}

function skillsRatio(skills: SkillMatch[]): number | null {
  if (skills.length === 0) return null;
  const weights = skills.map((s) => IMPORTANCE_WEIGHT[s.importance] * frequencyWeight(s.jdCount));
  const earned = skills.reduce((sum, s, i) => sum + weights[i] * termCredit(s, s.jdCount), 0);
  return earned / weights.reduce((a, b) => a + b, 0);
}

const CHECK_CREDIT: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

function checksRatio(checks: Check<string>[]): number {
  return checks.reduce((sum, c) => sum + CHECK_CREDIT[c.status], 0) / checks.length;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function verdictMessage(rate: number, breakdown: ScoreComponent[]): string {
  const gap = [...breakdown].sort((a, b) => b.weight * (1 - b.ratio) - a.weight * (1 - a.ratio))[0];
  const biggest = gap && gap.ratio < 1 ? ` Your biggest gap is ${gap.label.toLowerCase()}.` : "";
  if (rate >= 80) return `Strong match. You're past the ${TARGET_MATCH_RATE}% target; fix any red items and apply.`;
  if (rate >= TARGET_MATCH_RATE) {
    return `You've reached the ${TARGET_MATCH_RATE}% target. Adding missing skills you really have builds a margin.${biggest}`;
  }
  if (rate >= 50) {
    return `${TARGET_MATCH_RATE - rate} points below the ${TARGET_MATCH_RATE}% target. Start with missing high-importance skills you actually have.${biggest}`;
  }
  return `Low match. Tailor this resume to the posting, or treat the missing skills as a real gap for this role.${biggest}`;
}

/** The whole Match Report for one resume version against one posting. Pure: same input, same report. */
export function buildMatchReport({ job, jobText, resume: doc, file, asOf }: ReportInput): MatchReport {
  const resume = readResume(doc);
  const match: MatchContext = { resumeText: resume.text, jobText, lexicon: buildLexicon(jobText, resume.text) };

  const hardSkills = matchSkills(job.hardSkills, match);
  const softSkills = matchSkills(job.softSkills, match);
  const predictedSkills = matchPredictedSkills(job.predictedSkills, match);
  const searchability = searchabilityChecks({ resume, job, file, match });
  const formatting = formattingChecks(file, resume.text);
  const tips = recruiterTips({ resume, job, jobText, asOf });

  const title = searchability.filter((c) => c.id === "job-title-match");
  const education = searchability.filter((c) => c.id === "education-match");
  const parsing = searchability.filter((c) => c.id !== "job-title-match" && c.id !== "education-match");

  const ratios: Record<ComponentId, number | null> = {
    hardSkills: skillsRatio(hardSkills),
    jobTitle: checksRatio(title),
    softSkills: skillsRatio(softSkills),
    education: education.length > 0 ? checksRatio(education) : null,
    searchability: checksRatio(parsing),
    formatting: checksRatio(formatting),
    recruiterTips: checksRatio(tips),
    predictedSkills: predictedSkills.length > 0 ? mean(predictedSkills.map((p) => termCredit(p))) : null,
  };

  const live = (Object.keys(WEIGHTS) as ComponentId[]).filter((id) => ratios[id] !== null);
  const totalWeight = live.reduce((sum, id) => sum + WEIGHTS[id], 0);
  const breakdown: ScoreComponent[] = live.map((id) => {
    const weight = WEIGHTS[id] / totalWeight;
    const ratio = ratios[id]!;
    return { id, label: LABELS[id], weight, ratio, points: Math.round(weight * ratio * 1000) / 10 };
  });
  const matchRate = Math.round(breakdown.reduce((sum, c) => sum + c.weight * c.ratio, 0) * 100);

  return {
    matchRate,
    verdict: { target: TARGET_MATCH_RATE, reached: matchRate >= TARGET_MATCH_RATE, message: verdictMessage(matchRate, breakdown) },
    breakdown,
    hardSkills,
    softSkills,
    searchability,
    formatting,
    recruiterTips: tips,
    predictedSkills,
  };
}
