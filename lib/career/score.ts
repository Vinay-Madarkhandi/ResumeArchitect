import type { Score, ScorePart } from "@/lib/schemas/career";

export interface PartInput {
  id: string;
  label: string;
  /** Base weight before redistribution. */
  base: number;
  /** null when there is nothing to measure; its weight goes to the other parts. */
  ratio: number | null;
  detail: string;
}

/** Weighted total from parts, the same way the resume match score handles missing components. */
export function weightedScore(inputs: PartInput[]): Score {
  const live = inputs.filter((p): p is PartInput & { ratio: number } => p.ratio !== null);
  const totalBase = live.reduce((sum, p) => sum + p.base, 0);
  const parts: ScorePart[] = live.map((p) => ({
    id: p.id,
    label: p.label,
    weight: totalBase ? p.base / totalBase : 0,
    ratio: Math.min(1, Math.max(0, p.ratio)),
    detail: p.detail,
  }));
  const total = Math.round(parts.reduce((sum, p) => sum + p.weight * p.ratio, 0) * 100);
  return { total, parts };
}

/** Points a part contributes, for the breakdown. */
export function partPoints(part: ScorePart): number {
  return Math.round(part.weight * part.ratio * 100);
}

export function share<T>(xs: T[], pass: (x: T) => boolean): number | null {
  return xs.length ? xs.filter(pass).length / xs.length : null;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** A digit that reads as a result: 38%, $2M, 12 engineers, 3x. Years alone ("2021") don't count. */
const RESULT_RE = /(?:[$£€]\s?\d|\d[\d,.]*\s?(?:%|percent|x\b|[kmb]\b)|\b(?!(?:19|20)\d{2}\b)\d[\d,.]*\b)/i;

export function hasMeasurableResult(text: string): boolean {
  return RESULT_RE.test(text);
}
