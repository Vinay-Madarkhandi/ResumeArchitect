import { Icon } from "@/components/icon/Icon";
import type { ChangeExplanation } from "@/lib/schemas/tailoring";

/** Plain, non-scored explanations of what changed and why — the product
 * spec explicitly bans AI confidence scores/percentages/badges, so this is
 * deliberately just readable text, never a meter or a number.
 *
 * A "flagged" entry isn't a change explanation — it's a proper-noun-like
 * phrase in the tailored text that wasn't found in the original, surfaced
 * for the user to verify (see lib/tailoring/fabricationGuardrail.ts). It's
 * never auto-rejected, just visibly called out, styled distinctly (warning
 * tone) from an ordinary "change" card. */
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
      {changes.map((change, index) =>
        change.kind === "flagged" ? (
          <div key={index} className="relative overflow-hidden rounded border border-error/40 bg-error-container/20 p-sm">
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-error" />
            <p className="mb-1 flex items-center gap-1.5 font-mono text-label-sm text-error">
              <Icon name="warning" size={14} />
              Please verify
            </p>
            {change.quote && (
              <p className="mb-1 font-doc text-body-lg italic text-on-surface">&ldquo;{change.quote}&rdquo;</p>
            )}
            <p className="font-sans text-sm text-on-surface-variant">{change.why}</p>
          </div>
        ) : (
          <div key={index} className="relative overflow-hidden rounded border border-outline-variant bg-surface-container-lowest p-sm">
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-secondary" />
            {change.quote && (
              <p className="mb-1 font-mono text-label-sm text-secondary">&ldquo;{change.quote}&rdquo;</p>
            )}
            <p className="mb-1 font-sans text-body-lg font-medium text-on-surface">{change.whatChanged}</p>
            <p className="flex items-start gap-1.5 font-sans text-sm text-on-surface-variant">
              <Icon name="lightbulb" size={14} className="mt-0.5 shrink-0" />
              {change.why}
            </p>
          </div>
        ),
      )}
    </div>
  );
}
