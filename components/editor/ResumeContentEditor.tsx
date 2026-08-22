import type { ResumeContent } from "@/lib/schemas/resume";
import { PersonalInfoEditor } from "@/components/editor/sections/PersonalInfoEditor";
import { SummaryEditor } from "@/components/editor/sections/SummaryEditor";
import { ExperienceEditor } from "@/components/editor/sections/ExperienceEditor";
import { ProjectsEditor } from "@/components/editor/sections/ProjectsEditor";
import { EducationEditor } from "@/components/editor/sections/EducationEditor";
import { SkillsEditor } from "@/components/editor/sections/SkillsEditor";
import { CertificationsEditor } from "@/components/editor/sections/CertificationsEditor";

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-sm font-sans text-headline-md text-on-surface">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Full structured editor for a ResumeContent — every field editable, list
 * sections with add/remove. Shared by the onboarding review step and the
 * document editor (Stage 4 layers reorder/undo/compare around this).
 */
export function ResumeContentEditor({
  value,
  onChange,
  lowConfidenceFields,
}: {
  value: ResumeContent;
  onChange: (next: ResumeContent) => void;
  lowConfidenceFields?: string[];
}) {
  return (
    <div className="space-y-xl">
      <SectionBlock title="Personal info">
        <PersonalInfoEditor
          value={value.personalInfo}
          onChange={(personalInfo) => onChange({ ...value, personalInfo })}
          lowConfidenceFields={lowConfidenceFields}
        />
      </SectionBlock>

      <SectionBlock title="Summary">
        <SummaryEditor value={value.summary} onChange={(summary) => onChange({ ...value, summary })} />
      </SectionBlock>

      <SectionBlock title="Experience">
        <ExperienceEditor
          value={value.experience}
          onChange={(experience) => onChange({ ...value, experience })}
          lowConfidenceFields={lowConfidenceFields}
        />
      </SectionBlock>

      <SectionBlock title="Projects">
        <ProjectsEditor value={value.projects} onChange={(projects) => onChange({ ...value, projects })} />
      </SectionBlock>

      <SectionBlock title="Education">
        <EducationEditor
          value={value.education}
          onChange={(education) => onChange({ ...value, education })}
          lowConfidenceFields={lowConfidenceFields}
        />
      </SectionBlock>

      <SectionBlock title="Skills">
        <SkillsEditor value={value.skills} onChange={(skills) => onChange({ ...value, skills })} />
      </SectionBlock>

      <SectionBlock title="Certifications">
        <CertificationsEditor
          value={value.certifications}
          onChange={(certifications) => onChange({ ...value, certifications })}
        />
      </SectionBlock>
    </div>
  );
}
