import type { TailoredChange } from "@/lib/schemas/tailoring";
import type { Hunk } from "@/lib/resume/diff";
import type { Unit } from "@/lib/resume/units";

export type RedlineItem = { type: "equal"; unit: Unit; index: number } | { type: "hunk"; hunk: Hunk };

/** Interleaves unchanged lines and hunks in reading order for the redline page. */
export function buildRedline(after: Unit[], hunks: Hunk[]): RedlineItem[] {
  const startsAt = new Map<number, Hunk[]>();
  for (const h of hunks) {
    const list = startsAt.get(h.afterIndex) ?? [];
    list.push(h);
    startsAt.set(h.afterIndex, list);
  }
  const items: RedlineItem[] = [];
  let p = 0;
  while (p <= after.length) {
    const here = startsAt.get(p) ?? [];
    for (const h of here.filter((x) => x.after.length === 0)) items.push({ type: "hunk", hunk: h });
    if (p === after.length) break;
    const spanning = here.find((x) => x.after.length > 0);
    if (spanning) {
      items.push({ type: "hunk", hunk: spanning });
      p += spanning.after.length;
    } else {
      items.push({ type: "equal", unit: after[p], index: p });
      p++;
    }
  }
  return items;
}

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Finds the AI change behind a hunk: same new line, or same original line.
 * A hunk with no match is the user's own edit (or an accepted Ask-AI rewrite).
 */
export function matchChange(hunk: Hunk, changes: TailoredChange[]): TailoredChange | null {
  const afterMd = hunk.after.map((u) => norm(u.markdown));
  const beforeMd = hunk.before.map((u) => norm(u.markdown));
  return (
    changes.find((c) => c.after && afterMd.includes(norm(c.after))) ??
    changes.find((c) => c.before && beforeMd.includes(norm(c.before)) && (c.op !== "remove" || hunk.kind === "removed")) ??
    null
  );
}
