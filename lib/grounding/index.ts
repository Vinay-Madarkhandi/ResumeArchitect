import { parseInline } from "@/lib/documentMarkdown";
import { inlineText } from "@/lib/resume/units";
import type { ChangeFlag } from "@/lib/schemas/tailoring";
import { FIGURE, normalizeFigure } from "./figures";
import { VERIFY_CLAIM } from "./placeholder";

const ALIASES = [
  [/\b(?:go language|golang)\b/g, "go"],
  [/\b(?:postgresql|postgres)\b/g, "postgresql"],
  [/\b(?:kubernetes|k8s)\b/g, "kubernetes"],
  [/\b(?:javascript|js)\b/g, "javascript"],
  [/\b(?:built|builds|building|build)\b/g, "build"],
  [/\b(?:wrote|writes|write)\b/g, "write"],
  [/\b(?:reduced|reduces|reduce|cut)\b/g, "reduce"],
  [/\b(?:sorted|sort)\b/g, "sort"],
] as const;

const TOOLS = /(?<![\w.])(?:Go|Golang|PostgreSQL|Postgres|Kafka|Kubernetes|K8s|Docker|Python|Java(?:Script)?|TypeScript|React|Next\.js|Node\.js|Redis|AWS|Azure|MongoDB|MySQL|SQL|S3|OAuth2|GitHub|Excel|C\+\+|C#)(?![\w.])/gi;
const TITLE = /\b(?:(?:senior|junior|lead|principal|staff|backend|frontend|full[- ]stack|software|platform|data|product|project|engineering|sales|operations)\s+)*(?:engineer|developer|designer|analyst|manager|architect|director|consultant|specialist|intern|founder|scientist|president)\b/gi;
const EMPLOYER = /\b[A-Z][\w&'-]*(?:[ \t]+[A-Z][\w&'-]*){0,4}\s+(?:Inc\.?|Ltd\.?|LLC|Corp\.?|GmbH|Corporation)\b/g;
const NAME = /\b[A-Z][\w&/-]*(?:[ \t]+[A-Z][\w&/-]*){1,4}\b/g;

// Each evidence unit is checked as a whole. A bag of terms would join unrelated
// jobs, strip negation, or attach the right number to the wrong result.
const LEADER = /^[ \t]*(?:#{1,6}|[-*•]|\d+\.)[ \t]+/gm;

function canonical(text: string) {
  let value = text.normalize("NFKC").toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[–—]/g, "-")
    .replace(FIGURE, normalizeFigure)
    .replace(/^i\s+/, "")
    .replace(/\b(?:a|an|the)\s+/g, "");
  for (const [pattern, alias] of ALIASES) value = value.replace(pattern, alias);
  return value.replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();
}

function describe(text: string) {
  const nodes = parseInline(text.trim());
  const plain = inlineText(nodes).trim();
  const links = nodes.flatMap((node) => node.type === "text"
    ? (node.marks ?? []).flatMap((mark) => mark.type === "link" ? [mark.attrs.href] : [])
    : []);
  return { plain, key: canonical(plain), links };
}

function split(text: string) {
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

interface Claim {
  text: string;
  evidence: string | null;
  flags: ChangeFlag[];
}

function flag(kind: ChangeFlag["kind"], value: string, context?: string): ChangeFlag {
  return {
    kind, value,
    message: kind === "number"
      ? `Verify “${value}” in “${context}”. The source needs to show what the figure measures.`
      : `Verify “${value}”. We couldn't trace it to the supplied source.`,
  };
}

export function properNouns(text: string): string[] {
  return [...text.matchAll(NAME)].flatMap((match) => {
    const words = match[0].split(/\s+/);
    const preceding = text.slice(0, match.index).trimEnd();
    if (!preceding || /[.!?:;]$/.test(preceding)) words.shift();
    return words.length >= 2 ? [words.join(" ")] : [];
  });
}

function unsupported(text: string): ChangeFlag[] {
  const flags: ChangeFlag[] = [];
  for (const [figure] of text.matchAll(FIGURE)) flags.push(flag("number", figure, text));
  for (const [tool] of text.matchAll(TOOLS)) flags.push(flag("skill", tool));
  for (const [name] of text.matchAll(EMPLOYER)) flags.push(flag("name", name));
  for (const name of properNouns(text)) flags.push(flag("name", name));
  for (const [title] of text.matchAll(TITLE)) flags.push(flag("title", title));
  flags.push(flag("claim", text));
  return flags;
}

export function uniqueFlags(flags: ChangeFlag[]) {
  const seen = new Set<string>();
  return flags.filter(({ value }) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Verify complete factual clauses using only the sources the caller attests to.
 * Limited aliases permit straightforward linguistic changes. Ambiguous rewrites
 * need review even when all their individual words occur in the source.
 */
export function checkGrounding(sources: readonly string[], output: string) {
  const evidence = sources.flatMap((source) => {
    const parts = split(source.replace(/\r\n?/g, "\n").replace(LEADER, ""));
    return parts.flatMap((part, index) => index % 2 === 0 && !parts[index + 1]?.startsWith("?") ? [describe(part)] : []);
  }).filter(({ key }) => key);
  const parts = split(output.replace(/\r\n/g, "\n"));
  const claims: Claim[] = [];
  const text = parts.map((part) => {
    if (!part.trim() || /^[|.!?]$/.test(part.trim())) return part;
    const { key, plain, links } = describe(part.replace(LEADER, ""));
    if (!key) return part;
    const match = evidence.find((entry) => entry.key === key && links.every((link) => entry.links.includes(link)));
    const flags = match ? [] : unsupported(plain);
    claims.push({ text: plain, evidence: match?.plain ?? null, flags });
    return match ? part : VERIFY_CLAIM;
  }).join("");
  return {
    claims,
    supported: claims.filter((claim) => claim.evidence !== null),
    unsupported: claims.filter((claim) => claim.evidence === null),
    flags: uniqueFlags(claims.flatMap((claim) => claim.flags)),
    text,
  };
}

/** Feedback may echo only a literal excerpt of the candidate's answer. */
export function answerQuote(answer: string, suggestion: string): string | null {
  const normalize = (text: string) => text.trim().replace(/\s+/g, " ");
  const quote = normalize(suggestion).replace(/^["“](.*)["”]$/, "$1");
  if (!quote || checkGrounding([answer], quote).flags.length) return null;
  const clean = normalize(answer);
  const at = clean.indexOf(quote);
  return at < 0 ? null : clean.slice(at, at + quote.length);
}
