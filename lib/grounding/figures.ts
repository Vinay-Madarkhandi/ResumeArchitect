// Match quantities without treating digits inside names such as S3 as figures.
const NUMBER_WORD = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter)";

export const FIGURE = new RegExp(
  `(?<![\\w.])(?:[$€£]?[+-]?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?(?:\\s?%|\\+|[kmbx]\\b|\\s+(?:percent|per cent|thousand|million|billion|trillion)\\b)?(?![\\w%]))|\\b${NUMBER_WORD}(?:[- ](?:and[- ])?${NUMBER_WORD})*(?:\\s+(?:percent|per cent|thousand|million|billion|trillion))?\\b`,
  "giu",
);

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1_000, million: 1_000_000, billion: 1_000_000_000, trillion: 1_000_000_000_000,
  half: 0.5, quarter: 0.25,
};

const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or",
  "as", "is", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "that", "which", "who", "whom", "this", "these", "those", "it", "its", "they", "their", "them",
  "i", "my", "we", "our", "you", "your", "he", "she", "his", "her", "across", "per", "using",
  "into", "through", "during", "before", "after", "above", "below", "up", "down", "out", "off", "over", "under",
]);

export function parseWordNumber(text: string): number | null {
  const words = text.toLowerCase().split(/[\s-]+/).filter((w) => w && w !== "and");
  if (!words.length || !words.every((w) => w in NUMBER_WORDS)) return null;
  let total = 0;
  let current = 0;
  for (const w of words) {
    const val = NUMBER_WORDS[w];
    if (val === 100) {
      current = (current || 1) * 100;
    } else if (val >= 1000) {
      current = (current || 1) * val;
      total += current;
      current = 0;
    } else {
      current += val;
    }
  }
  return total + current;
}

export function normalizeFigure(figure: string): string {
  const trimmed = figure.trim().toLowerCase();
  const isPercent = /(?:%|percent|per cent)$/.test(trimmed);
  const clean = trimmed.replace(/\s*(?:%|percent|per cent)$/, "").trim();

  // Spelled-out word number
  const wordVal = parseWordNumber(clean);
  if (wordVal !== null) {
    return isPercent ? `${wordVal}%` : `${wordVal}`;
  }

  // Thousands separator: 2,000 -> 2000
  let norm = clean.replace(/,(\d{3})/g, "$1");
  // European decimal comma: e.g. 3,8% vs 38%
  if (/^\d+,\d{1,2}$/.test(norm)) {
    norm = norm.replace(",", ".");
  } else {
    norm = norm.replace(/,/g, "");
  }

  // Currency prefix
  let prefix = "";
  if (/^[$€£]/.test(norm)) {
    prefix = norm[0];
    norm = norm.slice(1).trim();
  }

  // Multipliers: 4 million -> 4m, 4 thousand -> 4k
  norm = norm
    .replace(/\s+thousand$/, "k")
    .replace(/\s+million$/, "m")
    .replace(/\s+billion$/, "b")
    .replace(/\s+trillion$/, "t");

  if (prefix) {
    return isPercent ? `${prefix}${norm}%` : `${prefix}${norm}`;
  }
  return isPercent ? `${norm}%` : norm;
}

export interface FigureMatch {
  raw: string;
  normalized: string;
  numValue?: number;
  isPercent: boolean;
  isCurrency: boolean;
  headNoun?: string;
  measureWords: string[];
  index: number;
}

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function extractFiguresWithMeasures(clauseText: string): FigureMatch[] {
  const matches: FigureMatch[] = [];
  for (const match of clauseText.matchAll(FIGURE)) {
    const raw = match[0].trim();
    if (!raw) continue;
    // Skip if it looks like part of a tech name or path (e.g. S3, IPv6)
    if (/^[a-zA-Z]+\d+$/.test(raw)) continue;

    const normalized = normalizeFigure(raw);
    const isPercent = /(?:%|percent)/i.test(raw);
    const isCurrency = /^[$€£]/.test(raw) || /(?:dollar|euro|pound)/i.test(raw);

    const start = match.index ?? 0;
    const end = start + match[0].length;

    // Isolate words strictly within the current clause boundary (stopping at . ! ? ; \n)
    const beforeClause = clauseText.slice(0, start).split(/[.!?;\n]/).pop() ?? "";
    const afterClause = clauseText.slice(end).split(/[.!?;\n]/)[0] ?? "";

    const beforeWords = beforeClause.split(/\s+/).map(cleanWord).filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !(w in NUMBER_WORDS));
    const afterWords = afterClause.split(/\s+/).map(cleanWord).filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !(w in NUMBER_WORDS));

    // Determine primary head noun:
    let headNoun: string | undefined;
    if (/\b(?:by|from|to|at)\s*$/i.test(beforeClause.trim())) {
      if (beforeWords.length > 0) {
        headNoun = beforeWords[beforeWords.length - 1];
      } else if (afterWords.length > 0) {
        headNoun = afterWords[0];
      }
    } else if (afterWords.length > 0) {
      headNoun = afterWords[0];
    } else if (beforeWords.length > 0) {
      headNoun = beforeWords[beforeWords.length - 1];
    }

    const measureWords = [...new Set([...beforeWords.slice(-3), ...afterWords.slice(0, 3)])];

    let numValue: number | undefined;
    const numPart = normalized.replace(/^[$€£]/, "").replace(/[%kmbx+]$/i, "");
    const parsed = Number(numPart);
    if (!Number.isNaN(parsed)) {
      let multiplier = 1;
      if (/k$/i.test(normalized)) multiplier = 1_000;
      else if (/m$/i.test(normalized)) multiplier = 1_000_000;
      else if (/b$/i.test(normalized)) multiplier = 1_000_000_000;
      numValue = parsed * multiplier;
    }

    matches.push({
      raw,
      normalized,
      numValue,
      isPercent,
      isCurrency,
      headNoun,
      measureWords,
      index: start,
    });
  }
  return matches;
}

export function areMeasuresCompatible(figA: FigureMatch, figB: FigureMatch): boolean {
  if (figA.headNoun && figB.headNoun) {
    if (figA.headNoun === figB.headNoun) return true;
    if (figA.headNoun.startsWith(figB.headNoun) || figB.headNoun.startsWith(figA.headNoun)) {
      if (Math.min(figA.headNoun.length, figB.headNoun.length) >= 4) return true;
    }
    if (figB.measureWords.includes(figA.headNoun) || figA.measureWords.includes(figB.headNoun)) {
      return true;
    }
    // Both have distinct head nouns that do not match
    return false;
  }

  if (figA.measureWords.length === 0 || figB.measureWords.length === 0) return true;

  // Check overlap of content words
  const setB = new Set(figB.measureWords);
  for (const word of figA.measureWords) {
    if (setB.has(word)) return true;
    for (const b of figB.measureWords) {
      if (word.startsWith(b) || b.startsWith(word)) {
        if (Math.min(word.length, b.length) >= 4) return true;
      }
    }
  }
  return false;
}

export function isFigureSupported(target: FigureMatch, sourceFigures: FigureMatch[]): boolean {
  // Find source figures with the same normalized value or numeric value
  const candidates = sourceFigures.filter((src) => {
    if (src.normalized === target.normalized) return true;
    if (src.isPercent === target.isPercent && src.isCurrency === target.isCurrency) {
      if (src.numValue !== undefined && target.numValue !== undefined && src.numValue === target.numValue) {
        return true;
      }
    }
    return false;
  });

  if (candidates.length === 0) return false;

  // Check if any candidate has a compatible measure
  return candidates.some((cand) => areMeasuresCompatible(target, cand));
}
