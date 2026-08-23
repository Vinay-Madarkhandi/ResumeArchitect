import type { ResumeContent } from "@/lib/schemas/resume";
import type { ChangeExplanation } from "@/lib/schemas/tailoring";
import { Icon } from "@/components/icon/Icon";

function ChangedDot({ changed }: { changed: boolean }) {
  if (!changed) return null;
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" title="This section changed" />;
}

/** Read-only rendering of the resume this tailored version was generated
 * from, with a small dot next to any section change_explanations mentions —
 * intentionally not a line-by-line diff (the product spec asks to avoid
 * overwhelming insignificant word-level differences and focus on meaningful
 * changes, which ChangeExplanationsPanel already does in plain language). */
export function OriginalComparisonPanel({
  content,
  changes,
}: {
  content: ResumeContent;
  changes: ChangeExplanation[];
}) {
  const changedSections = new Set(changes.map((c) => c.section));

  return (
    <div className="space-y-lg font-doc text-sm opacity-80">
      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {content.personalInfo.fullName}
          </h3>
          <ChangedDot changed={changedSections.has("personalInfo")} />
        </div>
        {content.personalInfo.headline && <p>{content.personalInfo.headline}</p>}
      </div>

      {content.summary && (
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Summary</h3>
            <ChangedDot changed={changedSections.has("summary")} />
          </div>
          <p>{content.summary}</p>
        </div>
      )}

      {content.experience.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Experience</h3>
            <ChangedDot changed={changedSections.has("experience")} />
          </div>
          <div className="space-y-sm">
            {content.experience.map((entry) => (
              <div key={entry.id}>
                <p className="font-medium">
                  {entry.role} <span className="font-normal">— {entry.company}</span>
                </p>
                <ul className="ml-4 list-disc space-y-0.5">
                  {entry.bullets.map((b) => (
                    <li key={b.id}>{b.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.skills.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Skills</h3>
            <ChangedDot changed={changedSections.has("skills")} />
          </div>
          <p>{content.skills.map((g) => g.items.join(", ")).join(" · ")}</p>
        </div>
      )}

      <p className="flex items-center gap-1.5 font-sans text-xs italic text-on-surface-variant">
        <Icon name="history" size={12} />
        This is your original resume, shown for reference only.
      </p>
    </div>
  );
}
