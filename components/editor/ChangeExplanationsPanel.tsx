import { Icon } from "@/components/icon/Icon";
import type { ChangeExplanation } from "@/lib/schemas/tailoring";

const SECTION_LABELS: Record<ChangeExplanation["section"], string> = {
  personalInfo: "Personal info",
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
};

/** Plain, non-scored explanations of what changed and why — the product
 * spec explicitly bans AI confidence scores/percentages/badges, so this is
 * deliberately just readable text, never a meter or a number. */
export function ChangeExplanationsPanel({ changes }: { changes: ChangeExplanation[] }) {
  if (changes.length === 0) {
    return (
      <p className="font-sans text-body-lg text-on-surface-variant">
        No notable changes were made — your original content was already a strong match.
      </p>
    );
  }

  return (
    <div className="space-y-sm">
      {changes.map((change, index) => (
        <div key={index} className="relative overflow-hidden rounded border border-outline-variant bg-surface-container-lowest p-sm">
          <div className="absolute bottom-0 left-0 top-0 w-1 bg-secondary" />
          <p className="mb-1 font-mono text-label-sm text-secondary">{SECTION_LABELS[change.section]}</p>
          <p className="mb-1 font-sans text-body-lg font-medium text-on-surface">{change.whatChanged}</p>
          <p className="flex items-start gap-1.5 font-sans text-sm text-on-surface-variant">
            <Icon name="lightbulb" size={14} className="mt-0.5 shrink-0" />
            {change.why}
          </p>
        </div>
      ))}
    </div>
  );
}
