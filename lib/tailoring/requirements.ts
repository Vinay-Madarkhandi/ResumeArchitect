import type { JobAnalysis, Requirement } from "@/lib/schemas/jobAnalysis";
import type { Unit } from "@/lib/resume/units";
import { termPattern } from "@/lib/resume/termPattern";

export type RequirementEvidence = Pick<Requirement, "id" | "label" | "importance"> & {
  matched: boolean;
  evidence: string | null;
};

/** Evidence for tailoring instructions and review labels. */
export function requirementEvidence(units: Unit[], job: JobAnalysis) {
  const find = (terms: string[]) => {
    const patterns = terms.filter((t) => t.trim()).map(termPattern);
    return units.find((unit) => patterns.some((pattern) => pattern.test(unit.text)))?.text ?? null;
  };
  const requirements: RequirementEvidence[] = job.requirements.map(({ id, label, importance, aliases }) => {
    const evidence = find([label, ...aliases]);
    return { id, label, importance, matched: evidence !== null, evidence };
  });
  const keywords = job.keywords.map(({ term, aliases }) => ({ term, matched: find([term, ...aliases]) !== null }));
  return { requirements, keywords };
}
