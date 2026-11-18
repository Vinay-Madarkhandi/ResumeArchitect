import type { DetectedAts } from "@/lib/ats";
import type { MatchReport, SkillMatch } from "./report";

type Snapshot = {
  jobTitle: string | null;
  company: string | null;
  resumeLabel: string;
  createdAt: string;
  matchRate: number;
  report: MatchReport;
};

export function formatMatchReport(scan: Snapshot, ats: DetectedAts | null): string {
  const report = scan.report;
  const title = [scan.jobTitle || "Untitled job", scan.company].filter(Boolean).join(" · ");
  const header = ["Match report", title, scan.resumeLabel, scan.createdAt];
  if (!report.breakdown) return [...header, "", `Match rate: ${scan.matchRate}%`].join("\n");
  const section = (heading: string, lines: string[]) => ["", heading, ...(lines.length ? lines : ["None identified."])];
  const skills = (items: SkillMatch[]) => items.map((s) => (
    `${s.term} — ${s.importance} importance, job ×${s.jdCount}, resume ×${s.resumeCount}, ${s.status}${s.matchedForm ? ` (${s.matchedForm})` : ""}${s.advice ? `\n  ${s.advice}` : ""}`
  ));
  const checks = (items: MatchReport["searchability"] | MatchReport["formatting"] | MatchReport["recruiterTips"]) =>
    items.map((c) => `${c.label} [${c.status}]: ${c.detail}${c.fix ? `\n  Fix: ${c.fix}` : ""}`);

  return [
    ...header,
    "",
    `Match rate: ${report.matchRate}% · target ${report.verdict.target}%`,
    ...section("Score breakdown", report.breakdown.map((c) => `${c.label}: ${Number(c.points.toFixed(1))}/${Math.round(c.weight * 100)} points`)),
    ...section("Hard skills", skills(report.hardSkills)),
    ...section("Soft skills", skills(report.softSkills)),
    ...section("Other keywords", skills(report.otherKeywords)),
    ...section("Searchability", checks(report.searchability)),
    ...section("Formatting", checks(report.formatting)),
    ...section("Recruiter tips", checks(report.recruiterTips)),
    ...section("Predicted skills", report.predictedSkills.map((s) => `${s.term} [${s.status}]${s.reason ? `: ${s.reason}` : ""}${s.advice ? `\n  ${s.advice}` : ""}`)),
    ...section("ATS tips", ats
      ? [ats.name, ats.parsingNotes, ...ats.guidance.flatMap((g) => [g.text, ...g.sources])]
      : ["Use the requested file type, keep headings standard, and check the application's parsed preview."]),
    "",
  ].join("\n");
}
