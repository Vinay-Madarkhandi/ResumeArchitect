import type { ReactNode } from "react";
import { AtsNote } from "@/components/scan/AtsNote";
import { CheckList, PredictedSkills, SkillTable } from "@/components/scan/reportParts";
import type { DetectedAts } from "@/lib/ats";
import type { MatchReport } from "@/lib/report/report";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0 rounded-lg border border-line bg-panel p-4 sm:p-5">
      <h2 className="mb-3 text-title font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ReportSections({ report, ats }: { report: MatchReport; ats: DetectedAts | null }) {
  return (
    <div className="grid min-w-0 gap-4">
      <Section title="Hard skills"><SkillTable skills={report.hardSkills} label="Hard skills" /></Section>
      <Section title="Soft skills"><SkillTable skills={report.softSkills} label="Soft skills" /></Section>
      <Section title="Other keywords"><SkillTable skills={report.otherKeywords} label="Other keywords" /></Section>
      <Section title="Searchability"><CheckList checks={report.searchability} /></Section>
      <Section title="Formatting"><CheckList checks={report.formatting} /></Section>
      <Section title="Recruiter tips"><CheckList checks={report.recruiterTips} /></Section>
      <Section title="Predicted skills"><PredictedSkills skills={report.predictedSkills} /></Section>
      <Section title="ATS tips">
        {ats ? <AtsNote ats={ats} /> : (
          <p className="text-small text-ink-2">Use the file type requested by the employer, keep headings standard, and check the application’s parsed preview before submitting.</p>
        )}
      </Section>
    </div>
  );
}
