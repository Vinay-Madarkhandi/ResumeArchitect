import { Icon } from "@/components/icon/Icon";
import { DocumentCanvas } from "@/components/editor/DocumentCanvas";
import type { DocumentContent } from "@/lib/schemas/document";

/** Read-only rendering of the document this tailored version was generated
 * from, reusing the same live canvas in non-editable mode so it looks
 * exactly like the real document rather than a separate hand-built
 * summary. Intentionally not a line-by-line diff — the product spec asks
 * to avoid overwhelming insignificant word-level differences and focus on
 * meaningful changes, which ChangeExplanationsPanel already does in plain
 * language. */
export function OriginalComparisonPanel({ content }: { content: DocumentContent }) {
  return (
    <div className="space-y-sm">
      <DocumentCanvas initialContent={content} editable={false} variant="compact" />
      <p className="flex items-center gap-1.5 font-sans text-xs italic text-on-surface-variant">
        <Icon name="history" size={12} />
        This is your original resume, shown for reference only.
      </p>
    </div>
  );
}
