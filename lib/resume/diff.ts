import type { Unit } from "@/lib/resume/units";

/**
 * Line-level alignment of two resumes plus word-level redlines inside
 * changed lines. Every change in the product is shown through this module,
 * whether the AI, Ask-AI, or the user made it, so the review screen can never
 * disagree with what is actually in the document.
 */

export interface WordOp {
  type: "equal" | "insert" | "delete";
  text: string;
}

export type HunkKind = "modified" | "added" | "removed";

export interface Hunk {
  /** Stable for the same before/after content, so acknowledgements survive reloads. */
  id: string;
  kind: HunkKind;
  before: Unit[];
  after: Unit[];
  /** Index in the `after` units where this hunk starts (insertion point when `after` is empty). */
  afterIndex: number;
  /** Word-level redline. Only present on 1:1 modified hunks. */
  words?: WordOp[];
}

const TOKEN_RE = /\s+|[A-Za-z0-9][A-Za-z0-9+#./'’-]*[A-Za-z0-9+#]|[A-Za-z0-9]|[^\sA-Za-z0-9]/g;

export function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

/** Longest-common-subsequence table walk; returns pairs of matched indexes in order. */
function lcsPairs<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

function pushOp(ops: WordOp[], type: WordOp["type"], text: string) {
  const last = ops[ops.length - 1];
  if (last && last.type === type) last.text += text;
  else ops.push({ type, text });
}

export function diffWords(before: string, after: string): WordOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const pairs = lcsPairs(a, b, (x, y) => x === y);
  const ops: WordOp[] = [];
  let i = 0;
  let j = 0;
  for (const [pi, pj] of [...pairs, [a.length, b.length] as [number, number]]) {
    while (i < pi) pushOp(ops, "delete", a[i++]);
    while (j < pj) pushOp(ops, "insert", b[j++]);
    if (pi < a.length && pj < b.length) {
      pushOp(ops, "equal", a[pi]);
      i = pi + 1;
      j = pj + 1;
    }
  }
  return ops;
}

function signature(u: Unit): string {
  return `${u.kind}:${u.level ?? ""}:${u.markdown.replace(/\s+/g, " ").trim().toLowerCase()}`;
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9+#]+/g) ?? []);
}

/** Share of words two lines have in common (Dice coefficient). */
export function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 && wb.size === 0) return 1;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return (2 * common) / (wa.size + wb.size);
}

const PAIR_THRESHOLD = 0.3;

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function makeHunk(kind: HunkKind, before: Unit[], after: Unit[], afterIndex: number): Hunk {
  const id = hash(
    `${kind}|${before.map((u) => u.markdown).join("\n")}|${after.map((u) => u.markdown).join("\n")}`,
  );
  const hunk: Hunk = { id, kind, before, after, afterIndex };
  if (kind === "modified") hunk.words = diffWords(before[0].text, after[0].text);
  return hunk;
}

/**
 * Pairs each removed line with the most similar added line in the same gap,
 * in order, so a rewritten bullet reads as one modification instead of a
 * deletion plus an addition.
 */
function hunksForGap(removed: Unit[], added: Unit[], afterStart: number): Hunk[] {
  const hunks: Hunk[] = [];
  let r = 0;
  let a = 0;
  while (r < removed.length || a < added.length) {
    if (r < removed.length && a < added.length) {
      // Find the best partner for removed[r] among the remaining added lines.
      let best = -1;
      let bestScore = PAIR_THRESHOLD;
      for (let k = a; k < added.length; k++) {
        if (added[k].kind !== removed[r].kind) continue;
        const s = similarity(removed[r].text, added[k].text);
        if (s >= bestScore) {
          best = k;
          bestScore = s;
        }
      }
      if (best === -1) {
        hunks.push(makeHunk("removed", [removed[r]], [], afterStart + a));
        r++;
        continue;
      }
      for (; a < best; a++) hunks.push(makeHunk("added", [], [added[a]], afterStart + a));
      hunks.push(makeHunk("modified", [removed[r]], [added[a]], afterStart + a));
      r++;
      a++;
    } else if (r < removed.length) {
      hunks.push(makeHunk("removed", [removed[r]], [], afterStart + a));
      r++;
    } else {
      hunks.push(makeHunk("added", [], [added[a]], afterStart + a));
      a++;
    }
  }
  return hunks;
}

/** Makes ids unique when the same change happens at several places. */
function disambiguate(hunks: Hunk[]): Hunk[] {
  const seen = new Map<string, number>();
  return hunks.map((h) => {
    const n = seen.get(h.id) ?? 0;
    seen.set(h.id, n + 1);
    return n === 0 ? h : { ...h, id: `${h.id}-${n}` };
  });
}

export function diffUnits(before: Unit[], after: Unit[]): Hunk[] {
  const sigA = before.map(signature);
  const sigB = after.map(signature);
  const pairs = lcsPairs(sigA, sigB, (x, y) => x === y);
  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  for (const [pi, pj] of [...pairs, [before.length, after.length] as [number, number]]) {
    if (pi > i || pj > j) hunks.push(...hunksForGap(before.slice(i, pi), after.slice(j, pj), j));
    i = pi + 1;
    j = pj + 1;
  }
  return disambiguate(hunks);
}

/**
 * Puts the original lines of one hunk back. Hunk positions refer to the
 * `after` array they were computed from; if those lines are no longer there
 * (the document moved on), returns null instead of replacing the wrong lines.
 */
export function revertHunk(after: Unit[], hunk: Hunk): Unit[] | null {
  const current = after.slice(hunk.afterIndex, hunk.afterIndex + hunk.after.length);
  if (current.length !== hunk.after.length || current.some((u, k) => signature(u) !== signature(hunk.after[k]))) {
    return null;
  }
  return [
    ...after.slice(0, hunk.afterIndex),
    ...hunk.before,
    ...after.slice(hunk.afterIndex + hunk.after.length),
  ];
}
