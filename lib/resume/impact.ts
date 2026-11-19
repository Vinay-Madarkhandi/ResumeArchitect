import { buildMatchReport } from "@/lib/report/matchReport";
import type { MatchReport, ReportInput } from "@/lib/report/report";
import { revertHunk, type Hunk } from "@/lib/resume/diff";
import { fromUnits, type Unit } from "@/lib/resume/units";

export interface ChangeImpact {
  /** Points this change is worth: current score minus the score with it reverted. */
  points: number;
  /** Requirement or keyword labels that are satisfied only because of this change. */
  gained: string[];
  /** Ones that are lost because of it (e.g. a removed line). */
  lost: string[];
}

function satisfied(report: MatchReport): Set<string> {
  return new Set([
    ...report.hardSkills, ...report.softSkills, ...report.otherKeywords, ...report.predictedSkills,
  ].filter((skill) => skill.status !== "missing").map((skill) => skill.term));
}

/**
 * What one change contributes to the score, found by scoring the document
 * with just that change reverted. Deterministic, so it can be shown per card.
 */
export function changeImpact(units: Unit[], hunk: Hunk, target: Omit<ReportInput, "resume">, current: MatchReport): ChangeImpact {
  const without = revertHunk(units, hunk);
  if (!without) return { points: 0, gained: [], lost: [] };
  const baseline = buildMatchReport({ ...target, resume: fromUnits(without) });
  const now = satisfied(current);
  const then = satisfied(baseline);
  return {
    points: current.matchRate - baseline.matchRate,
    gained: [...now].filter((x) => !then.has(x)),
    lost: [...then].filter((x) => !now.has(x)),
  };
}
