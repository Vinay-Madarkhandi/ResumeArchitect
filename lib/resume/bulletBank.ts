import type { DocumentContent } from "@/lib/schemas/document";
import { fromUnits, isLocked, toUnits, unitFromMarkdown, type Unit } from "@/lib/resume/units";

/**
 * Career history: every bullet the user has written, across all resumes.
 * A resume "uses" a bullet when the bullet's text is in its document, so
 * toggling one off removes the line from that resume only; the bank keeps it.
 * A bullet remembers the section (h2) and role (h3) it was written under,
 * which is where it goes back when toggled on.
 */
export interface BankBullet {
  /** Normalized text: the identity of a bullet across resumes. */
  key: string;
  /** Inline Markdown, so bold and links survive the round trip. */
  markdown: string;
  section: string | null;
  role: string | null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function bulletKey(text: string): string {
  return norm(text).replace(/[.;,]+$/, "");
}

interface Placed {
  unit: Unit;
  section: string | null;
  role: string | null;
}

/** Every unit with the section and role heading it sits under. */
function place(units: Unit[]): Placed[] {
  let section: string | null = null;
  let role: string | null = null;
  return units.map((unit) => {
    if (unit.kind === "heading" && unit.level === 2) {
      section = unit.text || null;
      role = null;
    } else if (unit.kind === "heading" && unit.level === 3) {
      role = unit.text || null;
    }
    return { unit, section, role };
  });
}

const isBullet = (u: Unit) => u.kind === "bullet" && !isLocked(u) && u.text.length > 0;

export function harvestBullets(doc: DocumentContent): BankBullet[] {
  const seen = new Map<string, BankBullet>();
  for (const { unit, section, role } of place(toUnits(doc))) {
    if (!isBullet(unit)) continue;
    const key = bulletKey(unit.text);
    if (!seen.has(key)) seen.set(key, { key, markdown: unit.markdown, section, role });
  }
  return [...seen.values()];
}

export function includedKeys(doc: DocumentContent): Set<string> {
  return new Set(toUnits(doc).filter(isBullet).map((u) => bulletKey(u.text)));
}

export function removeBullet(doc: DocumentContent, key: string): DocumentContent {
  return fromUnits(toUnits(doc).filter((u) => !(isBullet(u) && bulletKey(u.text) === key)));
}

/**
 * Index of the last unit in the block that starts at a heading matching
 * `label` (at `level`), or -1. A block runs until the next heading at the
 * same level or above.
 */
function blockEnd(placed: Placed[], level: 2 | 3, label: string): number {
  const start = placed.findIndex(({ unit }) => unit.kind === "heading" && unit.level === level && norm(unit.text) === norm(label));
  if (start < 0) return -1;
  let end = start;
  for (let i = start + 1; i < placed.length; i++) {
    const u = placed[i].unit;
    if (u.kind === "heading" && (u.level ?? 1) <= level) break;
    end = i;
  }
  return end;
}

/** Puts the bullet back under its role, else its section, else at the end. No-op if it's already there. */
export function insertBullet(doc: DocumentContent, bullet: BankBullet): DocumentContent {
  const all = toUnits(doc);
  if (all.some((u) => isBullet(u) && bulletKey(u.text) === bullet.key)) return doc;
  const empty = all.length === 1 && all[0].kind === "paragraph" && !all[0].text;
  const units = empty ? [] : all;
  const placed = place(units);
  let at = -1;
  if (bullet.role) {
    const end = blockEnd(placed, 3, bullet.role);
    // The same role title can recur in different sections; prefer the one under the bullet's own section.
    if (end >= 0 && (!bullet.section || norm(placed[end].section ?? "") === norm(bullet.section))) at = end;
  }
  if (at < 0 && bullet.section) at = blockEnd(placed, 2, bullet.section);
  if (at < 0) at = units.length - 1;
  const next = [...units];
  next.splice(at + 1, 0, unitFromMarkdown("bullet", bullet.markdown));
  return fromUnits(next);
}

/** The bank merged with bullets only this document has so far, bank order first. */
export function mergeBank(bank: BankBullet[], doc: DocumentContent): BankBullet[] {
  const keys = new Set(bank.map((b) => b.key));
  return [...bank, ...harvestBullets(doc).filter((b) => !keys.has(b.key))];
}
