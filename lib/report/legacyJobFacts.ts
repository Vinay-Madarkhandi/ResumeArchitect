import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { JobFacts, JobSkill } from "@/lib/schemas/jobFacts";

export function legacyJobFacts(job: JobAnalysis): JobFacts {
  const levelHint = `${job.seniority ?? ""} ${job.title}`;
  const level = /\b(?:executive|director|head of|vp|chief)\b/i.test(levelHint) ? "executive"
    : /\b(?:senior|staff|lead|principal)\b/i.test(levelHint) ? "senior"
    : /\b(?:intern|junior|entry|graduate)\b/i.test(levelHint) ? "entry" : "mid";
  const toSkill = (requirement: JobAnalysis["requirements"][number]): JobSkill => ({
    term: requirement.label, importance: requirement.importance === "must" ? "high" : "low",
  });

  return {
    title: job.title,
    level,
    hardSkills: job.requirements.filter((r) => r.category !== "soft").map(toSkill),
    softSkills: job.requirements.filter((r) => r.category === "soft").map(toSkill),
    otherKeywords: job.keywords.map(({ term }) => ({ term, importance: "medium" })),
    education: null,
    yearsRequired: null,
    predictedSkills: [],
  };
}
