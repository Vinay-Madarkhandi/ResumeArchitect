import { parseInline } from "@/lib/documentMarkdown";
import { inlineText } from "@/lib/resume/units";
import type { ChangeFlag } from "@/lib/schemas/tailoring";
import {
  extractFiguresWithMeasures,
  isFigureSupported,
  FIGURE,
} from "./figures";
import {
  extractClaims,
  isDegreeSupported,
  isEmployerSupported,
  isTitleSupported,
  isToolSupported,
} from "./entities";
import { VERIFY_CLAIM } from "./placeholder";

const LEADER = /^[ \t]*(?:#{1,6}|[-*•]|\d+\.)[ \t]+/gm;

const SAFE_LINES = new Set([
  "dear hiring manager",
  "dear hiring manager,",
  "i'm applying for this role",
  "i am applying for this role",
  "i'm applying for this role.",
  "i'd welcome a conversation",
  "i would welcome a conversation",
  "i'd welcome a conversation.",
  "thank you for your consideration",
  "thank you for your consideration.",
  "sincerely",
  "sincerely,",
  "best regards",
  "best regards,",
  "experience",
  "education",
  "skills",
  "summary",
]);

const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or",
  "as", "is", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "that", "which", "who", "whom", "this", "these", "those", "it", "its", "they", "their", "them",
  "i", "my", "we", "our", "you", "your", "he", "she", "his", "her", "across", "per", "using",
  "into", "through", "during", "before", "after", "above", "below", "up", "down", "out", "off", "over", "under",
]);

function tokenizeContent(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function extractLinks(markdown: string): string[] {
  const nodes = parseInline(markdown);
  return nodes.flatMap((node) =>
    node.type === "text"
      ? (node.marks ?? []).flatMap((mark) => (mark.type === "link" ? [mark.attrs.href] : []))
      : []
  );
}

function split(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  // A Markdown link is atomic. Its URL is checked alongside its label.
  const separators = /\[[^\]\n]+\]\([^\n)]*\)|(\n+|[ \t]*\|[ \t]*|[.!?](?=\s|$)[ \t]*)/gu;
  for (const match of text.matchAll(separators)) {
    if (!match[1]) continue;
    parts.push(text.slice(start, match.index), match[1]);
    start = match.index + match[1].length;
  }
  parts.push(text.slice(start));
  return parts;
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

export function uniqueFlags(flags: ChangeFlag[]): ChangeFlag[] {
  const seen = new Set<string>();
  return flags.filter(({ kind, value }) => {
    const key = `${kind}:${value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function flag(kind: ChangeFlag["kind"], value: string, context?: string): ChangeFlag {
  return {
    kind,
    value,
    message:
      kind === "number"
        ? `Verify “${value}” in “${context}”. The source needs to show what the figure measures.`
        : `Verify “${value}”. We couldn't trace it to the supplied source.`,
  };
}

function unsupported(text: string): ChangeFlag[] {
  const flags: ChangeFlag[] = [];
  for (const [figure] of text.matchAll(FIGURE)) flags.push(flag("number", figure, text));
  const extracted = extractClaims(text);
  for (const tool of extracted.tools) flags.push(flag("skill", tool));
  for (const employer of extracted.employers) flags.push(flag("name", employer));
  for (const name of properNouns(text)) flags.push(flag("name", name));
  for (const title of extracted.titles) flags.push(flag("title", title));
  for (const deg of extracted.degrees) {
    flags.push(flag("claim", deg.degree));
    if (deg.field) flags.push(flag("name", deg.field));
  }
  for (const cert of extracted.certifications) flags.push(flag("name", cert));
  flags.push(flag("claim", text));
  return uniqueFlags(flags);
}

interface SourceEvidenceUnit {
  plain: string;
  markdown: string;
  tokens: string[];
  figures: ReturnType<typeof extractFiguresWithMeasures>;
  extracted: ReturnType<typeof extractClaims>;
  links: string[];
  isQuestion: boolean;
}

/** Check if a clause or sentence in output is grounded in the sources */
export function checkGrounding(sources: readonly string[], output: string) {
  // Normalize sources:
  // Tolerate PDF line breaks inside sentences (requirement 8)
  const normalizedSources = sources.map((s) =>
    s
      .replace(/\r\n?/g, "\n")
      .replace(/([^\n])\n([a-z])/g, "$1 $2") // join soft-wrapped lines from PDFs
  );
  const fullSourceText = normalizedSources.join("\n\n");
  const fullSourceFigures = extractFiguresWithMeasures(fullSourceText);
  const allSourceLinks = new Set(sources.flatMap(extractLinks));

  // Extract candidate evidence units from sources (sentences/clauses)
  const evidenceUnits: SourceEvidenceUnit[] = sources.flatMap((source) => {
    const rawUnits = split(source.replace(/\r\n?/g, "\n").replace(LEADER, ""));
    const units: SourceEvidenceUnit[] = [];
    for (let i = 0; i < rawUnits.length; i += 2) {
      const part = rawUnits[i]?.trim();
      const sep = rawUnits[i + 1] ?? "";
      if (!part) continue;
      const plain = inlineText(parseInline(part)).trim();
      if (!plain) continue;
      const isQuestion = sep.startsWith("?") || part.endsWith("?");
      units.push({
        plain,
        markdown: part,
        tokens: tokenizeContent(plain),
        figures: extractFiguresWithMeasures(plain),
        extracted: extractClaims(plain),
        links: extractLinks(part),
        isQuestion,
      });
    }
    return units;
  });

  const parts = split(output.replace(/\r\n/g, "\n"));
  const claims: Array<{ text: string; evidence: string | null; flags: ChangeFlag[] }> = [];

  const text = parts
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed || /^[|.!?]$/.test(trimmed)) return part;

      const plain = inlineText(parseInline(trimmed.replace(LEADER, ""))).trim();
      if (!plain) return part;

      const plainLower = plain.toLowerCase().replace(/[.,;:!?]+$/, "").trim();
      // Safe common phrases or section titles
      if (SAFE_LINES.has(plainLower)) {
        claims.push({ text: plain, evidence: plain, flags: [] });
        return part;
      }

      // Format tolerance for contact headers: "ada@example.com · +44... · London"
      if (plain.includes("·")) {
        const items = plain.split(/\s*·\s*/).filter(Boolean);
        const allItemsPresent = items.every((item) =>
          fullSourceText.toLowerCase().includes(item.trim().toLowerCase())
        );
        if (allItemsPresent) {
          claims.push({ text: plain, evidence: plain, flags: [] });
          return part;
        }
      }

      // Format tolerance for "### Title — Company" headings
      if (/^#{1,6}\s+.+?[—–-].+/.test(trimmed)) {
        const headingMatch = plain.match(/^(.+?)\s*[—–-]\s*(.+)$/);
        if (headingMatch) {
          const [, titlePart, companyPart] = headingMatch;
          const titleOk = isTitleSupported(titlePart.trim(), fullSourceText);
          const compOk = isEmployerSupported(companyPart.trim(), fullSourceText);
          if (titleOk && compOk) {
            claims.push({ text: plain, evidence: plain, flags: [] });
            return part;
          }
        }
      }

      const extracted = extractClaims(plain);
      const outTokens = tokenizeContent(plain);
      const outLinks = extractLinks(trimmed);

      // Check if ANY single source unit (non-question) can support this claim
      let matchingUnit: SourceEvidenceUnit | null = null;
      let bestScore = -1;

      for (const unit of evidenceUnits) {
        if (unit.isQuestion) continue;

        // Negation check: if unit has negation that plain lacks
        if (unit.extracted.hasNegation && !extracted.hasNegation) {
          continue;
        }

        // Scope check: if plain has high ownership and unit had low ownership
        if (extracted.hasHighOwnership) {
          if (/\b(?:helped|assisted|contributed|worked on)\b/i.test(unit.plain)) {
            if (!/\b(?:led|owned|architected|spearheaded|directed)\b/i.test(unit.plain)) {
              continue;
            }
          }
        }

        // Causal join check: if plain has causal join, unit must contain causal join
        if (extracted.hasCausalJoin && !unit.extracted.hasCausalJoin) {
          continue;
        }

        // Seniority check:
        const seniorityOk = extracted.seniority.every((s) =>
          new RegExp(`\\b${s}\\b`, "i").test(unit.plain) || new RegExp(`\\b${s}\\b`, "i").test(fullSourceText)
        );
        if (!seniorityOk && extracted.seniority.length > 0) continue;

        // Certifications check:
        const certsOk = extracted.certifications.every((c) =>
          fullSourceText.toLowerCase().includes(c.toLowerCase())
        );
        if (!certsOk && extracted.certifications.length > 0) continue;

        // Figure check: every figure in plain must be supported by a figure in unit
        const figuresSupported = extracted.figures.length <= unit.figures.length
          && (() => {
            const used = new Set<number>();
            return extracted.figures.every((fig) => {
              const idx = unit.figures.findIndex((src, i) => !used.has(i) && isFigureSupported(fig, [src]));
              if (idx === -1) return false;
              used.add(idx);
              return true;
            });
          })();
        if (!figuresSupported && extracted.figures.length > 0) {
          continue;
        }

        // Tools check: every tool in plain must be supported in unit or full source
        const toolsInUnit = extracted.tools.every((t) => isToolSupported(t, unit.plain));
        const toolsInSource = extracted.tools.every((t) => isToolSupported(t, fullSourceText));
        if (!toolsInSource) continue;

        // Titles check:
        const titlesOk = extracted.titles.every((t) => isTitleSupported(t, unit.plain));
        if (!titlesOk && extracted.titles.length > 0) continue;

        // Employers check:
        const empOk = extracted.employers.every((e) => isEmployerSupported(e, unit.plain));
        if (!empOk && extracted.employers.length > 0) continue;

        // Degrees check:
        const degOk = extracted.degrees.every((d) => isDegreeSupported(d, unit.plain));
        if (!degOk && extracted.degrees.length > 0) continue;

        // Durations & Years:
        const durOk = extracted.durations.every((d) => unit.plain.toLowerCase().includes(d.toLowerCase()));
        if (!durOk && extracted.durations.length > 0) continue;
        const yrsOk = extracted.years.every((y) => unit.plain.replace(/,(\d{3})/g, "$1").includes(y));
        if (!yrsOk && extracted.years.length > 0) continue;

        // Links check:
        const linksOk = outLinks.every((l) => unit.links.includes(l));
        if (!linksOk && outLinks.length > 0) continue;

        // Token overlap check
        const overlap = outTokens.filter((tok) =>
          unit.tokens.some((ut) => ut === tok || ut.startsWith(tok) || tok.startsWith(ut))
        ).length;

        // Score this candidate unit
        const score = overlap + (toolsInUnit ? 5 : 0) + (extracted.figures.length ? 10 : 0);
        if (score > bestScore) {
          bestScore = score;
          matchingUnit = unit;
        }
      }

      // Check if source contains negation for any entity/topic in plain
      const sourceHasNegationForClaim = evidenceUnits.some((u) => {
        if (!u.extracted.hasNegation) return false;
        // If u has negation and shares tools or key tokens with plain
        const commonTools = extracted.tools.some((t) => isToolSupported(t, u.plain));
        const commonTokens = outTokens.filter((tok) => u.tokens.includes(tok));
        return commonTools || commonTokens.length >= 2;
      });

      let isSupported = false;
      let evidenceText: string | null = null;

      if (!sourceHasNegationForClaim && matchingUnit && (bestScore >= 1 || outTokens.length <= 1)) {
        isSupported = true;
        evidenceText = matchingUnit.plain;
      } else if (
        !sourceHasNegationForClaim
        && extracted.tools.every((t) => isToolSupported(t, fullSourceText))
        && extracted.figures.length <= fullSourceFigures.length
        && (() => {
          const used = new Set<number>();
          return extracted.figures.every((fig) => {
            const idx = fullSourceFigures.findIndex((src, i) => !used.has(i) && isFigureSupported(fig, [src]));
            if (idx === -1) return false;
            used.add(idx);
            return true;
          });
        })()
        && extracted.employers.every((e) => isEmployerSupported(e, fullSourceText))
        && extracted.titles.every((t) => isTitleSupported(t, fullSourceText))
        && extracted.seniority.every((s) => new RegExp(`\\b${s}\\b`, "i").test(fullSourceText))
        && extracted.certifications.every((c) => fullSourceText.toLowerCase().includes(c.toLowerCase()))
        && extracted.degrees.every((d) => isDegreeSupported(d, fullSourceText))
        && extracted.durations.every((d) => fullSourceText.toLowerCase().includes(d.toLowerCase()))
        && extracted.years.every((y) => fullSourceText.replace(/,(\d{3})/g, "$1").includes(y))
        && !extracted.hasHighOwnership
        && !extracted.hasCausalJoin
        && outLinks.every((l) => allSourceLinks.has(l))
      ) {
        // Check content words overlap with non-question units
        const nonQuestionUnits = evidenceUnits.filter((u) => !u.isQuestion);
        const bestNonQ = nonQuestionUnits.find((u) =>
          outTokens.some((t) => u.tokens.some((ut) => ut === t || ut.startsWith(t) || t.startsWith(ut)))
        );
        if (bestNonQ) {
          isSupported = true;
          evidenceText = bestNonQ.plain;
        }
      }

      const flags = isSupported ? [] : unsupported(plain);
      claims.push({
        text: plain,
        evidence: isSupported ? evidenceText : null,
        flags,
      });

      return isSupported ? part : VERIFY_CLAIM;
    })
    .join("");

  const allFlags = uniqueFlags(claims.flatMap((c) => c.flags));
  return {
    claims,
    supported: claims.filter((c) => c.evidence !== null),
    unsupported: claims.filter((c) => c.evidence === null),
    flags: allFlags,
    text,
  };
}

/** Feedback may echo only a literal excerpt of the candidate's answer. */
export function answerQuote(answer: string, suggestion: string): string | null {
  const normalize = (text: string) => text.trim().replace(/\s+/g, " ");
  const quote = normalize(suggestion).replace(/^["“](.*)["”]$/, "$1");
  if (!quote) return null;
  const clean = normalize(answer);
  const at = clean.indexOf(quote);
  if (at < 0) return null;
  return clean.slice(at, at + quote.length);
}
