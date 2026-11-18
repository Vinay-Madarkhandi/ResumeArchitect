import type { LineEdit } from "@/lib/gemini/prompts/tailorLines";
import type { TailoredChange } from "@/lib/schemas/tailoring";
import { isLocked, unitFromMarkdown, withMarkdown, type Unit, type UnitKind } from "@/lib/resume/units";

function same(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

/** A new line after a heading becomes a bullet when bullets follow, else a paragraph. */
function insertKind(anchor: Unit, next: Unit | undefined): UnitKind {
  if (anchor.kind !== "heading") return anchor.kind;
  return next && (next.kind === "bullet" || next.kind === "numbered") ? next.kind : "paragraph";
}

type ProposedChange = Omit<TailoredChange, "flags">;
type Proof = (change: ProposedChange, anchor: number) => TailoredChange;

/**
 * Applies line edits to the source lines. Edits pointing at lines that don't
 * exist, empty rewrites, and no-op rewrites are dropped; only the first
 * rewrite or remove per line counts, and locked lines (nested lists) are
 * never rewritten or removed. Returns the tailored lines plus one
 * change record per edit that actually changed something.
 */
export function applyEdits(
  units: Unit[],
  edits: LineEdit[],
  proof: Proof = (change) => ({ ...change, flags: [] }),
): { units: Unit[]; changes: TailoredChange[] } {
  const byLine = new Map<number, LineEdit[]>();
  for (const edit of edits) {
    if (!Number.isInteger(edit.line) || edit.line < 1 || edit.line > units.length) continue;
    const list = byLine.get(edit.line) ?? [];
    list.push(edit);
    byLine.set(edit.line, list);
  }

  const out: Unit[] = [];
  const changes: TailoredChange[] = [];
  let seq = 0;
  units.forEach((unit, index) => {
    function record(proposal: Omit<ProposedChange, "id">) {
      const change = proof({ id: `c${++seq}`, ...proposal }, index);
      changes.push(change);
      return change;
    }

    const lineEdits = byLine.get(index + 1) ?? [];
    const primary = isLocked(unit) ? undefined : lineEdits.find((e) => e.op === "rewrite" || e.op === "remove");

    if (primary?.op === "remove") {
      record({ op: "remove", before: unit.markdown, after: null, reason: primary.reason, requirementIds: primary.requirementIds });
    } else if (primary?.op === "rewrite" && primary.text.trim() && !same(primary.text, unit.markdown)) {
      const rewritten = withMarkdown(unit, primary.text);
      const change = record({
        op: "rewrite",
        before: unit.markdown,
        after: rewritten.markdown,
        reason: primary.reason,
        requirementIds: primary.requirementIds,
      });
      out.push(change.after === rewritten.markdown ? rewritten : withMarkdown(unit, change.after ?? unit.markdown));
    } else {
      out.push(unit);
    }

    for (const insert of lineEdits.filter((e) => e.op === "insert_after" && e.text.trim())) {
      const added = unitFromMarkdown(insertKind(unit, units[index + 1]), insert.text);
      const change = record({ op: "insert_after", before: null, after: added.markdown, reason: insert.reason, requirementIds: insert.requirementIds });
      if (change.after) out.push(change.after === added.markdown ? added : withMarkdown(added, change.after));
    }
  });

  return { units: out, changes };
}
