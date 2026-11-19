import { placeholderForFigure } from "./placeholder";

const NUMBER_WORD = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter)";

export const FIGURE = new RegExp(
  `(?<![\\w.])(?:[$€£]?[+-]?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?(?:\\s?%|\\+|[kmbx]\\b|\\s+(?:percent|per cent|thousand|million|billion|trillion)\\b)?(?![\\w%]))|\\b${NUMBER_WORD}(?:[- ](?:and[- ])?${NUMBER_WORD})*(?:\\s+(?:percent|per cent|thousand|million|billion|trillion))?\\b`,
  "giu",
);

export const NUMBER_WORDS: Record<string, number> = {
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

export const HYPHENATED_IDIOMS_REGEX = /\b(?:all-in-one|one-on-one|one-off|one-stop|first-hand|second-to-none|half-day)\b/gi;

export function isPartOfHyphenatedIdiom(word: string, contextBefore: string, contextAfter: string): boolean {
  const w = word.toLowerCase();
  if (w === "one") {
    if (/(?:all-in-)$/i.test(contextBefore)) return true;
    if (/^-(?:on-one|off|stop|way)\b/i.test(contextAfter)) return true;
  }
  if (w === "first" && /^-(?:hand|rate)\b/i.test(contextAfter)) return true;
  if (w === "second" && /^-(?:to-none|rate)\b/i.test(contextAfter)) return true;
  if (w === "half" && /^-(?:day)\b/i.test(contextAfter)) return true;
  return false;
}

export function isQuantityUsage(word: string, contextBefore: string, contextAfter: string): boolean {
  if (isPartOfHyphenatedIdiom(word, contextBefore, contextAfter)) {
    return false;
  }

  const w = word.toLowerCase();
  if (w !== "one" && w !== "half" && w !== "quarter") return true;

  const afterTrim = contextAfter.trim().toLowerCase();
  const beforeTrim = contextBefore.trim().toLowerCase();

  if (w === "quarter") {
    // Non-quantity: fiscal quarters, quarterly
    if (/\b(?:first|second|third|fourth|1st|2nd|3rd|4th|last|this|next|fiscal|q[1-4])\s+quarter\b/i.test(`${beforeTrim} ${w}`)) return false;
    if (/^\s*(?:results|earnings|revenue|report|financials|period)/i.test(afterTrim)) return false;
    // Quantity: a quarter of, quarter of, by a quarter
    if (/\b(?:a|by|cut|reduced|grew|lost|saved)\s+quarter\b/i.test(`${beforeTrim} ${w}`)) return true;
    if (/^\s*(?:of|million|billion|point|percent|%)/i.test(afterTrim)) return true;
    return false;
  }

  if (w === "half") {
    // half the team, half a million, cut by half, half of
    if (/^\s*(?:a|the|of|million|billion|point|percent|%|[0-9])/i.test(afterTrim)) return true;
    if (/\b(?:by|cut|reduced|grew|lost|saved)\s+half\b/i.test(`${beforeTrim} ${w}`)) return true;
    return false;
  }

  if (w === "one") {
    // Non-quantity phrases:
    if (/\b(?:no|some|every|any)\s+one\b/i.test(`${beforeTrim} ${w}`)) return false;
    if (/\bthe\s+first\s+one\b/i.test(`${beforeTrim} ${w}`)) return false;
    if (/\bthe\s+only\s+one\b/i.test(`${beforeTrim} ${w}`)) return false;
    if (/^\s*(?:another|by\s+one|-on-one|day)/i.test(afterTrim)) return false;
    // Quantity: followed by a noun or "of"
    if (/^\s*(?:of|[a-z]+)/i.test(afterTrim) && !/^\s*(?:of\s+my\s+favorite|of\s+the\s+most)/i.test(afterTrim)) return true;
    return false;
  }

  return true;
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
  // Find all hyphenated idiom spans in clauseText
  const idiomSpans: Array<[number, number]> = [];
  for (const m of clauseText.matchAll(HYPHENATED_IDIOMS_REGEX)) {
    if (m.index !== undefined) {
      idiomSpans.push([m.index, m.index + m[0].length]);
    }
  }

  for (const match of clauseText.matchAll(FIGURE)) {
    const raw = match[0].trim();
    if (!raw) continue;

    const start = match.index ?? 0;
    const end = start + match[0].length;

    // Skip if match falls within any hyphenated idiom
    if (idiomSpans.some(([iStart, iEnd]) => iStart <= start && end <= iEnd)) {
      continue;
    }
    // Skip if it looks like part of a tech name or path (e.g. S3, IPv6, OAuth2, K8s)
    if (/^[a-zA-Z]+\d+$/i.test(raw) || /^\d+[a-zA-Z]+$/i.test(raw)) {
      if (!/^[+-]?\d+(?:[kmbx%]|st|nd|rd|th)$/i.test(raw)) continue;
    }

    const contextBefore = clauseText.slice(Math.max(0, start - 20), start);
    const contextAfter = clauseText.slice(end, end + 25);

    // Quantity check for one, half, quarter:
    if (!isQuantityUsage(raw, contextBefore, contextAfter)) {
      continue;
    }

    const normalized = normalizeFigure(raw);
    const isPercent = /(?:%|percent)/i.test(raw);
    const isCurrency = /^[$€£]/.test(raw) || /(?:dollar|euro|pound)/i.test(raw);

    // Isolate words strictly within the current clause boundary (stopping at . ! ? ; \n)
    const beforeClause = clauseText.slice(0, start).split(/[.!?;\n]/).pop() ?? "";
    const afterClause = clauseText.slice(end).split(/[.!?;\n]/)[0] ?? "";

    const beforeWords = beforeClause.split(/\s+/).map(cleanWord).filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !(w in NUMBER_WORDS) && !/^\d+$/.test(w));
    const afterWords = afterClause.split(/\s+/).map(cleanWord).filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !(w in NUMBER_WORDS) && !/^\d+$/.test(w));

    // Determine primary head noun:
    let headNoun: string | undefined;
    const isPrepGoverned = /\b(?:by|from|to|at|of|in)\s*$/i.test(beforeClause.trim());
    if (isPrepGoverned) {
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

    const ADVERBIAL_PREPS = new Set(["through", "via", "using", "over", "across", "during", "within", "throughout", "under", "where", "while"]);
    const rawTokens = afterClause.trim().split(/\s+/);
    const immediateAfterWords: string[] = [];
    for (const token of rawTokens) {
      const w = cleanWord(token);
      if (!w) continue;
      if (ADVERBIAL_PREPS.has(w)) break;
      if (!STOPWORDS.has(w) && !(w in NUMBER_WORDS) && !/^\d+$/.test(w)) {
        immediateAfterWords.push(w);
      }
    }

    let measureWords: string[];
    if (isPrepGoverned) {
      measureWords = [...new Set([...beforeWords.slice(-3), ...immediateAfterWords.slice(0, 2)])];
    } else {
      const substantive = immediateAfterWords.filter((w) => !/^(?:weekly|annually|daily|yearly|monthly|per|ago)$/i.test(w));
      if (substantive.length > 0) {
        measureWords = substantive.slice(0, 4);
      } else {
        measureWords = [...new Set([...beforeWords.slice(-3), ...immediateAfterWords.slice(0, 3)])];
      }
    }

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

const ACTION_CHANGE_WORDS = new Set([
  "improved", "improve", "improving", "increased", "increase", "increasing",
  "reduced", "reduce", "reducing", "cut", "cutting", "raised", "raise", "raising",
  "boosted", "boost", "boosting", "maintained", "maintain", "maintaining",
  "grew", "grow", "growing", "growth", "exceeded", "exceed", "exceeding",
  "achieved", "achieve", "achieving", "delivered", "deliver", "delivering",
  "lowered", "lower", "lowering", "saved", "save", "saving", "dropped", "drop", "dropping",
  "generated", "generate", "generating", "earned", "earn", "earning",
  "spent", "spend", "spending", "drove", "drive", "driving", "led", "lead", "leading",
  "handled", "handle", "handling", "sorted", "sort", "sorting", "processed", "process",
  "percent", "percentage", "points", "point", "dollar", "dollars", "per", "cent",
]);

export function areMeasuresCompatible(figA: FigureMatch, figB: FigureMatch): boolean {
  const normalizeNoun = (s: string) =>
    s.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "").replace(/(?:ies|es|s)$/, (m) => (m === "ies" ? "y" : ""));

  const wordsA = figA.measureWords
    .flatMap((w) => w.toLowerCase().split("-"))
    .filter((w) => !ACTION_CHANGE_WORDS.has(w) && w.length >= 3)
    .map(normalizeNoun);

  const wordsB = figB.measureWords
    .flatMap((w) => w.toLowerCase().split("-"))
    .filter((w) => !ACTION_CHANGE_WORDS.has(w) && w.length >= 3)
    .map(normalizeNoun);

  // Pattern 7: A line merely containing a number must not satisfy a different measure
  if (wordsA.length > 0 && wordsB.length === 0) return false;
  if (wordsB.length > 0 && wordsA.length === 0) return false;
  if (wordsA.length === 0 && wordsB.length === 0) return true;

  const GENERIC_MEASURE_NOUNS = new Set([
    "rate", "score", "level", "metric", "ratio", "percentage", "percent", "count", "number"
  ]);

  const setB = new Set(wordsB);
  const common = wordsA.filter((w) => setB.has(w));
  const specificCommon = common.filter((w) => !GENERIC_MEASURE_NOUNS.has(w));
  if (specificCommon.length >= 1) return true;

  // Domain synonym equivalence:
  // spend / cost / expense / expenditure / budget
  const COST_SYNONYMS = new Set(["spend", "cost", "expense", "expenditure", "budget"]);
  const hasCostA = wordsA.some((w) => COST_SYNONYMS.has(w));
  const hasCostB = wordsB.some((w) => COST_SYNONYMS.has(w));
  if (hasCostA && hasCostB) return true;

  // latency / time / duration / delay / turnaround
  const TIME_SYNONYMS = new Set(["latency", "time", "duration", "delay", "turnaround"]);
  const hasTimeA = wordsA.some((w) => TIME_SYNONYMS.has(w));
  const hasTimeB = wordsB.some((w) => TIME_SYNONYMS.has(w));
  if (hasTimeA && hasTimeB) return true;

  // renewal / retention
  const RETENTION_SYNONYMS = new Set(["renewal", "retention"]);
  const hasRetentionA = wordsA.some((w) => RETENTION_SYNONYMS.has(w));
  const hasRetentionB = wordsB.some((w) => RETENTION_SYNONYMS.has(w));
  if (hasRetentionA && hasRetentionB) return true;

  // compliance / safety / rating / protocol
  const COMPLIANCE_SYNONYMS = new Set(["compliance", "safety", "rating", "protocol"]);
  const hasCompA = wordsA.some((w) => COMPLIANCE_SYNONYMS.has(w));
  const hasCompB = wordsB.some((w) => COMPLIANCE_SYNONYMS.has(w));
  if (hasCompA && hasCompB && (wordsA.includes("safety") || wordsB.includes("safety"))) return true;

  for (const a of wordsA) {
    if (GENERIC_MEASURE_NOUNS.has(a)) continue;
    for (const b of wordsB) {
      if (GENERIC_MEASURE_NOUNS.has(b)) continue;
      if (a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)))) {
        return true;
      }
    }
  }
  return false;
}
export function isFigureSupported(target: FigureMatch, sourceFigures: FigureMatch[]): boolean {
  // 1. Direct candidate match (same normalized value or numeric value)
  const directCandidates = sourceFigures.filter((src) => {
    if (src.normalized === target.normalized) return true;
    if (src.isPercent === target.isPercent && src.isCurrency === target.isCurrency) {
      if (src.numValue !== undefined && target.numValue !== undefined && src.numValue === target.numValue) {
        return true;
      }
    }
    return false;
  });

  if (directCandidates.length > 0 && directCandidates.some((cand) => areMeasuresCompatible(target, cand))) {
    return true;
  }

  // 2. Derived figures: arithmetic of figures in the cited line (difference, sum, ratio, percentage points)
  if (target.numValue !== undefined && sourceFigures.length >= 2) {
    const tVal = target.numValue;
    const isPointsChange = target.isPercent || /\b(?:points?|percentage\s+points?|pp)\b/i.test(target.raw) || target.measureWords.some((w) => /point/i.test(w));

    for (let i = 0; i < sourceFigures.length; i++) {
      for (let j = i + 1; j < sourceFigures.length; j++) {
        const figA = sourceFigures[i];
        const figB = sourceFigures[j];
        if (figA.numValue === undefined || figB.numValue === undefined) continue;

        const aVal = figA.numValue;
        const bVal = figB.numValue;

        // Check measure compatibility between operands and target
        const operandsCompatible = areMeasuresCompatible(figA, figB) || (figA.isCurrency && figB.isCurrency) || (figA.isPercent && figB.isPercent);
        const targetCompatible = areMeasuresCompatible(target, figA) || areMeasuresCompatible(target, figB);

        if (!operandsCompatible || !targetCompatible) continue;

        const diff = Math.abs(aVal - bVal);

        // Difference / Percentage-point change (e.g. from 30% to 22% -> 8 points or 8 percentage points)
        if (figA.isPercent && figB.isPercent && (target.isPercent || isPointsChange)) {
          if (Math.abs(tVal - diff) <= 0.1 || Math.abs(tVal - Math.round(diff)) <= 0.1) {
            return true;
          }
        } else if (figA.isCurrency && figB.isCurrency && target.isCurrency) {
          if (Math.abs(tVal - diff) <= 0.05 * Math.max(1, diff)) {
            return true;
          }
        } else if (!figA.isPercent && !figB.isPercent && !target.isPercent && figA.isCurrency === target.isCurrency) {
          if (Math.abs(tVal - diff) <= 0.05 * Math.max(1, diff)) {
            return true;
          }
        }

        // Relative percentage change / growth (e.g. from $2M to $3M -> 50% growth)
        if (target.isPercent) {
          for (const base of [aVal, bVal]) {
            if (base > 0) {
              const pct = (diff / base) * 100;
              if (Math.abs(tVal - pct) <= 1.0 || Math.abs(tVal - Math.round(pct)) <= 1.0) {
                return true;
              }
            }
          }
        }

        // Sum (e.g. $2M + $3M = $5M)
        const sum = aVal + bVal;
        if (figA.isCurrency === target.isCurrency && figA.isPercent === target.isPercent) {
          if (Math.abs(tVal - sum) <= 0.05 * Math.max(1, sum)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function figuresIn(text: string): Set<string> {
  const figures = extractFiguresWithMeasures(text);
  return new Set(figures.map((f) => f.normalized));
}

export function guardNumbers(output: string, source: string): string {
  const known = new Set<string>();
  for (const match of source.matchAll(FIGURE)) {
    const raw = match[0].trim();
    if (/^[a-zA-Z]+\\d+$/i.test(raw) || /^\\d+[a-zA-Z]+$/i.test(raw)) {
      if (!/^[+-]?\\d+(?:[kmbx%]|st|nd|rd|th)$/i.test(raw)) continue;
    }
    known.add(normalizeFigure(raw));
  }

  return output.replace(FIGURE, (figure) => {
    if (/^[a-zA-Z]+\\d+$/i.test(figure) || /^\\d+[a-zA-Z]+$/i.test(figure)) {
      if (!/^[+-]?\\d+(?:[kmbx%]|st|nd|rd|th)$/i.test(figure)) return figure;
    }
    const norm = normalizeFigure(figure);
    if (known.has(norm)) return figure;
    return placeholderForFigure(figure);
  });
}
