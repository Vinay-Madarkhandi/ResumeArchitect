import type { Importance } from "@/lib/schemas/jobFacts";
import { formattingChecks } from "./formatting";
import { groundJobSkills, matchPredictedSkills, matchSkills, matchTerm, type MatchContext } from "./keywords";
import { recruiterTips } from "./recruiterTips";
import type { Check, CheckStatus, ComponentId, MatchReport, ReportInput, ScoreComponent, SkillMatch, TermMatch } from "./report";
import { readResume, sectionText, type ResumeModel, type SectionKind } from "./resume";
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
 * | other keywords   | 10%    | 10–15%                                         |
 * | searchability    | 3%     | §3 parsing checks                              |
 * | recruiter tips   | 2%     | §3 recruiter preferences                      |
 *
 * The estimated weight for hard skills uses the middle of the range. Other
 * estimates use the lower end to leave room for predicted skills and checks.
 * A part with nothing to measure (no soft skills in the posting, no degree
 * asked for) hands its weight to the rest in proportion.
 */
export const WEIGHTS: Readonly<Record<ComponentId, number>> = {
  hardSkills: 0.45,
  jobTitle: 0.15,
  softSkills: 0.1,
  education: 0.05,
  searchability: 0.03,
  formatting: 0.05,
  recruiterTips: 0.02,
  predictedSkills: 0.05,
  otherKeywords: 0.1,
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
  otherKeywords: "Other keywords",
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

function skillsRatio(skills: SkillMatch[], placement: (term: string) => number = () => 1): number | null {
  if (skills.length === 0) return null;
  const weights = skills.map((s) => IMPORTANCE_WEIGHT[s.importance] * frequencyWeight(s.jdCount));
  const earned = skills.reduce((sum, s, i) => sum + weights[i] * termCredit(s, s.jdCount) * (s.status === "missing" ? 1 : placement(s.term)), 0);
  return earned / weights.reduce((a, b) => a + b, 0);
}

/**
 * §15 notes Jobscan scores keywords by section ("skills section vs buried in a
 * paragraph") without saying how much. This estimate gives full credit to a
 * skill shown in work (any line outside the Skills and Summary sections), a
 * little less to one only listed under Skills, and less again to one only
 * claimed in the summary.
 */
function placementCredit(resume: ResumeModel, match: MatchContext) {
  const listedIn = new Set<SectionKind>(["skills", "summary"]);
  const work = [
    ...resume.header,
    ...resume.sections.filter((s) => s.kind === null || !listedIn.has(s.kind)).flatMap((s) => s.units),
  ].map((u) => u.text).join("\n");
  const skills = sectionText(resume, "skills");
  const found = (term: string, resumeText: string) => matchTerm(term, { ...match, resumeText }).status !== "missing";
  return (term: string) => {
    if (work && found(term, work)) return 1;
    if (skills && found(term, `Skills\n${skills}`)) return 0.95;
    return 0.9;
  };
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
export function buildMatchReport({ job: facts, jobText, resume: doc, file, asOf }: ReportInput): MatchReport {
  const job = groundJobSkills(facts, jobText);
  const resume = readResume(doc);
  const match: MatchContext = { resumeText: resume.text, jobText, lexicon: buildLexicon(jobText, resume.text) };

  const hardSkills = matchSkills(job.hardSkills, match);
  const softSkills = matchSkills(job.softSkills, match);
  const otherKeywords = matchSkills(job.otherKeywords ?? [], match);
  const placement = placementCredit(resume, match);
  const predictedSkills = matchPredictedSkills(job.predictedSkills, match);
  const searchability = searchabilityChecks({ resume, job, file, match });
  const formatting = formattingChecks(file, resume);
  const tips = recruiterTips({ resume, job, jobText, asOf });

  const title = searchability.filter((c) => c.id === "job-title-match");
  const education = searchability.filter((c) => c.id === "education-match");
  const parsing = searchability.filter((c) => c.id !== "job-title-match" && c.id !== "education-match");

  const ratios: Record<ComponentId, number | null> = {
    hardSkills: skillsRatio(hardSkills, placement),
    jobTitle: checksRatio(title),
    softSkills: skillsRatio(softSkills),
    otherKeywords: skillsRatio(otherKeywords, placement),
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
    otherKeywords,
    searchability,
    formatting,
    recruiterTips: tips,
    predictedSkills,
  };
}
