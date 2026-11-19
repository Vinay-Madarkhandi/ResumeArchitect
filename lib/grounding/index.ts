import { parseInline } from "@/lib/documentMarkdown";
import { inlineText } from "@/lib/resume/units";
import type { ChangeFlag } from "@/lib/schemas/tailoring";
import {
  extractFiguresWithMeasures,
  isFigureSupported,
  type FigureMatch,
} from "./figures";
import {
  extractEntities,
  findVerbs,
  isEntitySupported,
  checkTeamInflation,
  checkCausalJoins,
  checkDomainQualifiers,
  lookupSynonymGroup,
  TEAM_FRAMING_REGEX,
  CAUSAL_JOIN_REGEX,
} from "./entities";
import { VERIFY_CLAIM } from "./placeholder";

export { VERIFY_CLAIM } from "./placeholder";

const LEADER = /^[ \t]*(?:#{1,6}|[-*•]|\d+\.)[ \t]+/gm;

const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or",
  "as", "is", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "that", "which", "who", "whom", "this", "these", "those", "it", "its", "they", "their", "them",
  "i", "my", "we", "our", "you", "your", "he", "she", "his", "her", "across", "per", "using",
  "into", "through", "during", "before", "after", "above", "below", "up", "down", "out", "off", "over", "under",
]);

export interface IndexedLine {
  lineNum: number;
  raw: string;
  normalized: string;
  tokens: Set<string>;
  figures: FigureMatch[];
  verbs: Array<{ word: string; level: number }>;
  strongestVerbLevel: number;
  strongestVerbWord?: string;
  hasTeamFraming: boolean;
  hasCausalJoin: boolean;
  isQuestion: boolean;
  hasNegation: boolean;
}

export interface SourceIndex {
  lines: Map<number, IndexedLine>;
  linesList: IndexedLine[];
  allTokens: Map<string, Set<number>>;
  framingWords: Set<string>;
  findBestMatchingLines(sentence: string, maxLines?: number): number[];
}

export function normalizeLineText(text: string): string {
  let norm = text.toLowerCase();
  norm = norm.replace(/[–—―−]/g, "-");
  norm = norm.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  norm = norm.replace(/(?<=\d),(?=\d{3}\b)/g, "");
  norm = norm.replace(/\b(?:per\s*cent|percent)\b/gi, "%");
  norm = norm
    .replace(/([$€£]?\d+(?:\.\d+)?)\s+million\b/gi, "$1m")
    .replace(/([$€£]?\d+(?:\.\d+)?)\s+billion\b/gi, "$1b")
    .replace(/([$€£]?\d+(?:\.\d+)?)\s+thousand\b/gi, "$1k")
    .replace(/([$€£]?\d+(?:\.\d+)?)\s+trillion\b/gi, "$1t");
  return norm;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—―−]/g, "-")
    .replace(/[^\p{L}\p{N}\s+#.-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

export function buildSourceIndex(
  sources: string[],
  extraFraming?: { company?: string | null; jobTitle?: string | null },
): SourceIndex {
  const lines = new Map<number, IndexedLine>();
  const linesList: IndexedLine[] = [];
  const allTokens = new Map<string, Set<number>>();
  let lineCounter = 1;

  const addToken = (tok: string, lineNum: number) => {
    if (!tok || tok.length < 2 || STOPWORDS.has(tok)) return;
    let set = allTokens.get(tok);
    if (!set) {
      set = new Set<number>();
      allTokens.set(tok, set);
    }
    set.add(lineNum);
  };

  for (const src of sources) {
    if (!src) continue;
    const splitLines = src.split(/\r?\n+/);
    for (const rawLine of splitLines) {
      const cleanRaw = rawLine.replace(LEADER, "").trim();
      if (!cleanRaw) continue;

      const lineNum = lineCounter++;
      const normalized = normalizeLineText(cleanRaw);
      const toks = tokenize(cleanRaw);
      const tokenSet = new Set(toks);

      for (const tok of toks) {
        addToken(tok, lineNum);
        const group = lookupSynonymGroup(tok);
        if (group) {
          for (const form of group.forms) {
            for (const ft of tokenize(form)) {
              addToken(ft, lineNum);
              tokenSet.add(ft);
            }
          }
        }
      }

      const figs = extractFiguresWithMeasures(cleanRaw);
      const verbs = findVerbs(cleanRaw);
      let strongestVerbLevel = 0;
      let strongestVerbWord: string | undefined;
      for (const v of verbs) {
        if (v.level > strongestVerbLevel) {
          strongestVerbLevel = v.level;
          strongestVerbWord = v.word;
        }
        const base = v.word.toLowerCase();
        addToken(base, lineNum);
        if (base === "built") addToken("build", lineNum);
        if (base === "build") addToken("built", lineNum);
        if (base === "wrote") addToken("write", lineNum);
        if (base === "write") addToken("wrote", lineNum);
        if (base === "reduced") addToken("reduce", lineNum);
        if (base === "reduce") addToken("reduced", lineNum);
        if (base === "cut") {
          addToken("reduce", lineNum);
          addToken("reduced", lineNum);
        }
        if (base === "led") addToken("lead", lineNum);
        if (base === "lead") addToken("led", lineNum);
      }

      const hasTeamFraming = TEAM_FRAMING_REGEX.test(cleanRaw);
      const hasCausalJoin = CAUSAL_JOIN_REGEX.test(cleanRaw);
      const isQuestion = /\?\s*$/.test(cleanRaw) || /^\s*(?:how|what|why|describe|tell|can|could|would)\b/i.test(cleanRaw);
      const hasNegation = /\b(?:never|not|didn't|did not|no|hardly|rarely|none|neither)\b/i.test(cleanRaw);

      const indexed: IndexedLine = {
        lineNum,
        raw: cleanRaw,
        normalized,
        tokens: tokenSet,
        figures: figs,
        verbs,
        strongestVerbLevel,
        strongestVerbWord,
        hasTeamFraming,
        hasCausalJoin,
        isQuestion,
        hasNegation,
      };

      lines.set(lineNum, indexed);
      linesList.push(indexed);
    }
  }

  const framingWords = new Set<string>();
  if (extraFraming?.company) {
    tokenize(extraFraming.company).forEach((w) => framingWords.add(w));
  }
  if (extraFraming?.jobTitle) {
    tokenize(extraFraming.jobTitle).forEach((w) => framingWords.add(w));
  }

  const findBestMatchingLines = (sentence: string, maxLines = 1): number[] => {
    const sToks = tokenize(sentence);
    if (sToks.length === 0) return linesList.length > 0 ? [linesList[0].lineNum] : [];

    const scores = new Map<number, number>();
    for (const tok of sToks) {
      const matchingLineNums = allTokens.get(tok);
      if (matchingLineNums) {
        for (const num of matchingLineNums) {
          scores.set(num, (scores.get(num) ?? 0) + 1);
        }
      }
      const group = lookupSynonymGroup(tok);
      if (group) {
        for (const form of group.forms) {
          for (const ft of tokenize(form)) {
            const matching = allTokens.get(ft);
            if (matching) {
              for (const num of matching) {
                scores.set(num, (scores.get(num) ?? 0) + 1);
              }
            }
          }
        }
      }
    }

    if (scores.size === 0) {
      return linesList.length > 0 ? [linesList[0].lineNum] : [];
    }

    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const maxScore = sorted[0][1];
    return sorted.filter((entry) => entry[1] === maxScore).slice(0, maxLines).map(([num]) => num);
  };

  return {
    lines,
    linesList,
    allTokens,
    framingWords,
    findBestMatchingLines,
  };
}

export function uniqueFlags(flags: ChangeFlag[]): ChangeFlag[] {
  const seen = new Set<string>();
  return flags.filter(({ kind, value }) => {
    const key = `${kind}:${value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function properNouns(text: string): string[] {
  const NAME = /\b[A-Z][\w&/-]*(?:[ \t]+[A-Z][\w&/-]*){1,4}\b/g;
  return [...text.matchAll(NAME)].flatMap((match) => {
    const words = match[0].split(/\s+/);
    const preceding = text.slice(0, match.index).trimEnd();
    if (!preceding || /[.!?:;]$/.test(preceding)) words.shift();
    return words.length >= 2 ? [words.join(" ")] : [];
  });
}

function extractLinks(markdown: string): string[] {
  const nodes = parseInline(markdown);
  return nodes.flatMap((node) =>
    node.type === "text"
      ? (node.marks ?? []).flatMap((mark) => (mark.type === "link" ? [mark.attrs.href] : []))
      : [],
  );
}

function splitSentences(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  const separators = /\[[^\]\n]+\]\([^\n)]*\)|(\n+|[ \t]*\|[ \t]*|[.!?](?=\s|$)[ \t]*)/gu;
  for (const match of text.matchAll(separators)) {
    if (!match[1]) continue;
    parts.push(text.slice(start, match.index), match[1]);
    start = match.index + match[1].length;
  }
  parts.push(text.slice(start));
  return parts;
}

export function verifySentence(
  sentence: string,
  citedLineNums: number[],
  sourceIndex: SourceIndex,
  options?: { isCoverLetter?: boolean },
): ChangeFlag[] {
  const flags: ChangeFlag[] = [];
  const cleanSentence = sentence.replace(LEADER, "").trim();
  if (!cleanSentence) return [];

  // Check cited line validity
  const validCitedLines: IndexedLine[] = [];
  for (const num of citedLineNums) {
    const line = sourceIndex.lines.get(num);
    if (!line) {
      flags.push({
        kind: "claim",
        value: String(num),
        message: `Line ${num} doesn't exist in the lines this cites.`,
      });
    } else {
      validCitedLines.push(line);
    }
  }

  // Fallback: if no valid cited lines, try token overlap
  let effectiveCitedLines = validCitedLines;
  if (effectiveCitedLines.length === 0) {
    const fallbackNums = sourceIndex.findBestMatchingLines(cleanSentence, 1);
    effectiveCitedLines = fallbackNums.map((n) => sourceIndex.lines.get(n)!).filter(Boolean);
  }

  if (effectiveCitedLines.length === 0) {
    flags.push({
      kind: "claim",
      value: cleanSentence,
      message: `Verify “${cleanSentence}”: this claim isn't in your resume.`,
    });
    return uniqueFlags(flags);
  }

  const citedTexts = effectiveCitedLines.map((l) => l.raw);

  // 1. Open-vocabulary Entities
  const entities = extractEntities(cleanSentence);

  // Proper names
  for (const name of entities.properNames) {
    if (!isEntitySupported(name, citedTexts, { isCoverLetter: options?.isCoverLetter, framingWords: sourceIndex.framingWords })) {
      flags.push({
        kind: "name",
        value: name,
        message: `Verify “${name}”: “${name}” isn't in the lines this cites.`,
      });
    }
  }

  // Credentials
  for (const cred of entities.credentials) {
    if (!isEntitySupported(cred, citedTexts, { isCoverLetter: options?.isCoverLetter, framingWords: sourceIndex.framingWords })) {
      flags.push({
        kind: "skill",
        value: cred,
        message: `Verify “${cred}”: “${cred}” isn't in the lines this cites.`,
      });
    }
  }

  // Titles
  for (const title of entities.titles) {
    if (!isEntitySupported(title, citedTexts, { isCoverLetter: options?.isCoverLetter, framingWords: sourceIndex.framingWords })) {
      flags.push({
        kind: "title",
        value: title,
        message: `Verify “${title}”: “${title}” isn't in the lines this cites.`,
      });
    }
  }

  // Capitalized tokens (tools, employers, products)
  for (const token of entities.capitalizedTokens) {
    if (entities.properNames.some((p) => p.includes(token))) continue;
    if (entities.credentials.some((c) => c.includes(token))) continue;
    if (entities.titles.some((t) => t.includes(token))) continue;

    if (!isEntitySupported(token, citedTexts, { isCoverLetter: options?.isCoverLetter, framingWords: sourceIndex.framingWords })) {
      flags.push({
        kind: "skill",
        value: token,
        message: `Verify “${token}”: “${token}” isn't in the lines this cites.`,
      });
    }
  }

  // 2. Figures & Measures
  const sentenceFigures = extractFiguresWithMeasures(cleanSentence);
  const citedFigures = effectiveCitedLines.flatMap((l) => l.figures);
  const usedCited = new Set<number>();

  for (const fig of sentenceFigures) {
    let foundIndex = -1;
    for (let i = 0; i < citedFigures.length; i++) {
      if (!usedCited.has(i) && isFigureSupported(fig, [citedFigures[i]])) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      usedCited.add(foundIndex);
    } else {
      const valCandidate = citedFigures.find((c) => c.normalized === fig.normalized || c.numValue === fig.numValue);
      if (valCandidate) {
        flags.push({
          kind: "number",
          value: fig.raw,
          message: `Verify “${fig.raw}”: “${fig.raw}” in “${cleanSentence}”. The source needs to show what the figure measures.`,
        });
      } else {
        flags.push({
          kind: "number",
          value: fig.raw,
          message: `Verify “${fig.raw}”: “${fig.raw}” isn't in your resume.`,
        });
      }
    }
  }

  // 3. Scope & Verb Strength
  const sentenceVerbs = findVerbs(cleanSentence);
  let sentenceMaxVerbLevel = 0;
  let sentenceMaxVerbWord: string | undefined;
  for (const v of sentenceVerbs) {
    if (v.level > sentenceMaxVerbLevel) {
      sentenceMaxVerbLevel = v.level;
      sentenceMaxVerbWord = v.word;
    }
  }

  const citedMaxVerbLevel = Math.max(0, ...effectiveCitedLines.map((l) => l.strongestVerbLevel));
  const citedMaxVerbWord = effectiveCitedLines.find((l) => l.strongestVerbLevel === citedMaxVerbLevel)?.strongestVerbWord ?? "source";

  if (sentenceMaxVerbLevel > citedMaxVerbLevel && citedMaxVerbLevel > 0) {
    flags.push({
      kind: "claim",
      value: sentenceMaxVerbWord ?? "scope",
      message: `Verify “${sentenceMaxVerbWord}”: '${sentenceMaxVerbWord}' claims more than '${citedMaxVerbWord}' in line ${effectiveCitedLines[0]?.lineNum ?? 1}.`,
    });
  }

  // 4. Team framing
  const teamInflation = checkTeamInflation(cleanSentence, effectiveCitedLines);
  if (teamInflation) {
    flags.push(teamInflation);
  }

  // 5. Causal joins
  const causalInflation = checkCausalJoins(cleanSentence, effectiveCitedLines);
  if (causalInflation) {
    flags.push(causalInflation);
  }

  // 6. Domain and scale qualifiers
  const qualifierFlags = checkDomainQualifiers(cleanSentence, citedTexts);
  for (const qf of qualifierFlags) {
    flags.push(qf);
  }

  // 7. Negation check
  const sentenceHasNegation = /\b(?:never|not|didn't|did not|no|hardly|rarely|none|neither)\b/i.test(cleanSentence);
  const anyCitedHasNegation = effectiveCitedLines.some((l) => l.hasNegation);
  if (anyCitedHasNegation && !sentenceHasNegation) {
    flags.push({
      kind: "claim",
      value: "negation",
      message: `Verify claim: original source states negation that was removed.`,
    });
  }

  // 8. Question check
  const sentenceIsQuestion = /\?\s*$/.test(cleanSentence) || /^\s*(?:how|what|why|describe|tell|can|could|would)\b/i.test(cleanSentence);
  const anyCitedIsQuestion = effectiveCitedLines.some((l) => l.isQuestion);
  if (anyCitedIsQuestion && !sentenceIsQuestion) {
    flags.push({
      kind: "claim",
      value: "question",
      message: `Verify claim: original source was a question, not an accomplished claim.`,
    });
  }

  // 9. Markdown links check
  const sentenceLinks = extractLinks(cleanSentence);
  const citedLinks = new Set(effectiveCitedLines.flatMap((l) => extractLinks(l.raw)));
  for (const link of sentenceLinks) {
    if (!citedLinks.has(link)) {
      flags.push({
        kind: "claim",
        value: link,
        message: `Verify “${link}”: link target isn't in your resume.`,
      });
    }
  }

  // If there are flags and no generic claim flag, add a claim flag
  if (flags.length > 0 && !flags.some((f) => f.kind === "claim")) {
    flags.push({
      kind: "claim",
      value: cleanSentence,
      message: `Verify “${cleanSentence}”: this claim isn't in your resume.`,
    });
  }

  return uniqueFlags(flags);
}

export interface GroundingResult {
  claims: Array<{ text: string; evidence: string | null; flags: ChangeFlag[] }>;
  supported: Array<{ text: string; evidence: string | null; flags: ChangeFlag[] }>;
  unsupported: Array<{ text: string; evidence: string | null; flags: ChangeFlag[] }>;
  flags: ChangeFlag[];
  text: string;
}

export function checkGrounding(
  sources: string[] | SourceIndex,
  text: string,
  options?: { cites?: number[]; isCoverLetter?: boolean; company?: string | null; jobTitle?: string | null },
): GroundingResult {
  const index: SourceIndex = Array.isArray(sources)
    ? buildSourceIndex(sources, { company: options?.company, jobTitle: options?.jobTitle })
    : sources;

  const parts = splitSentences(text.replace(/\r\n/g, "\n"));
  const claims: Array<{ text: string; evidence: string | null; flags: ChangeFlag[] }> = [];

  const verifiedParts = parts.map((part) => {
    const plain = inlineText(parseInline(part));
    const trimmed = plain.trim();
    if (!trimmed || /^[\p{P}\p{S}\s]+$/u.test(trimmed)) return part;

    const SAFE_LINES = new Set([
      "dear hiring manager", "dear hiring manager,",
      "i'm applying for this role", "i am applying for this role",
      "i'm applying for this role.", "i am applying for this role.",
      "i'd welcome a conversation", "i would welcome a conversation",
      "i'd welcome a conversation.", "i would welcome a conversation.",
      "thank you for your consideration", "thank you for your consideration.",
      "sincerely", "sincerely,", "best regards", "best regards,",
      "experience", "education", "skills", "summary",
    ]);
    if (SAFE_LINES.has(trimmed.toLowerCase())) {
      claims.push({ text: plain, evidence: plain, flags: [] });
      return part;
    }

    if (/^[A-Z][\w\s&/.-]*\s+[—–-]\s+[A-Z][\w\s&/.-]*$/.test(trimmed)) {
      claims.push({ text: plain, evidence: plain, flags: [] });
      return part;
    }

    if (options?.isCoverLetter && /\bapplying for\b/i.test(trimmed)) {
      claims.push({ text: plain, evidence: plain, flags: [] });
      return part;
    }

    const citedNums = options?.cites ?? [];
    const flags = verifySentence(part, citedNums, index, { isCoverLetter: options?.isCoverLetter });
    const isSupported = flags.length === 0;

    let evidence: string | null = null;
    if (isSupported) {
      if (citedNums.length > 0 && index.lines.has(citedNums[0])) {
        evidence = index.lines.get(citedNums[0])!.raw.replace(/[.!?]+$/, "").trim();
      } else {
        const best = index.findBestMatchingLines(part, 1);
        evidence = best.length > 0 ? index.lines.get(best[0])!.raw.replace(/[.!?]+$/, "").trim() : null;
      }
    }

    claims.push({
      text: plain,
      evidence,
      flags,
    });

    return isSupported ? part : VERIFY_CLAIM;
  });

  const allFlags = uniqueFlags(claims.flatMap((c) => c.flags));
  return {
    claims,
    supported: claims.filter((c) => c.evidence !== null),
    unsupported: claims.filter((c) => c.evidence === null),
    flags: allFlags,
    text: verifiedParts.join(""),
  };
}

export function answerQuote(answer: string, suggestion: string): string | null {
  const normalize = (text: string) => text.trim().replace(/\s+/g, " ");
  const quote = normalize(suggestion).replace(/^["“](.*)["”]$/, "$1");
  if (!quote || checkGrounding([answer], quote).flags.length) return null;
  const clean = normalize(answer);
  const at = clean.indexOf(quote);
  return at < 0 ? null : clean.slice(at, at + quote.length);
}
