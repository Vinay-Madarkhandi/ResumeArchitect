import { SYNONYM_GROUPS, formKey, type SynonymGroup } from "@/lib/report/synonyms";
import type { ChangeFlag } from "@/lib/schemas/tailoring";

// Fast lookup from normalized formKey -> SynonymGroup
const synonymGroupByKey = new Map<string, SynonymGroup>();
for (const group of SYNONYM_GROUPS) {
  for (const form of group.forms) {
    synonymGroupByKey.set(formKey(form), group);
    synonymGroupByKey.set(form.toLowerCase(), group);
  }
}

export function lookupSynonymGroup(term: string): SynonymGroup | null {
  return synonymGroupByKey.get(formKey(term)) ?? synonymGroupByKey.get(term.toLowerCase()) ?? null;
}

// Scope verb levels
export const VERB_LEVELS: Record<string, number> = {
  // Level 1: Low ownership
  participate: 1, participated: 1, participating: 1,
  assist: 1, assisted: 1, assisting: 1,
  help: 1, helped: 1, helping: 1,
  support: 1, supported: 1, supporting: 1,
  contribute: 1, contributed: 1, contributing: 1,
  collaborate: 1, collaborated: 1, collaborating: 1,
  partner: 1, partnered: 1, partnering: 1,

  // Level 2: Medium ownership
  "work on": 2, "worked on": 2, "working on": 2,
  build: 2, built: 2, building: 2,
  develop: 2, developed: 2, developing: 2,
  implement: 2, implemented: 2, implementing: 2,
  write: 2, wrote: 2, writing: 2, written: 2,
  design: 2, designed: 2, designing: 2,
  operate: 2, operated: 2, operating: 2,
  coordinate: 2, coordinated: 2, coordinating: 2,
  ship: 2, shipped: 2, shipping: 2,
  create: 2, created: 2, creating: 2,
  deploy: 2, deployed: 2, deploying: 2,
  maintain: 2, maintained: 2, maintaining: 2,
  test: 2, tested: 2, testing: 2,
  refactor: 2, refactored: 2, refactoring: 2,
  resolve: 2, resolved: 2, resolving: 2,
  streamline: 2, streamlined: 2, streamlining: 2,
  containerize: 2, containerized: 2, containerizing: 2,
  revamp: 2, revamped: 2, revamping: 2,
  instruct: 2, instructed: 2, instructing: 2,
  author: 2, authored: 2, authoring: 2,
  teach: 2, taught: 2, teaching: 2,
  deliver: 2, delivered: 2, delivering: 2,
  facilitate: 2, facilitated: 2, facilitating: 2,
  produce: 2, produced: 2, producing: 2,
  conduct: 2, conducted: 2, conducting: 2,
  perform: 2, performed: 2, performing: 2,
  execute: 2, executed: 2, executing: 2,
  automate: 2, automated: 2, automating: 2,
  prepare: 2, prepared: 2, preparing: 2,
  identify: 2, identified: 2, identifying: 2,
  organize: 2, organized: 2, organizing: 2,
  integrate: 2, integrated: 2, integrating: 2,
  track: 2, tracked: 2, tracking: 2,
  negotiate: 2, negotiated: 2, negotiating: 2,
  administer: 2, administered: 2, administering: 2,
  monitor: 2, monitored: 2, monitoring: 2,
  provide: 2, provided: 2, providing: 2,
  chart: 2, charted: 2, charting: 2,
  mentor: 2, mentored: 2, mentoring: 2,
  run: 2, ran: 2, running: 2,
  cut: 2, reduce: 2, reduced: 2, reducing: 2,
  raise: 2, raised: 2, raising: 2,
  improve: 2, improved: 2, improving: 2,
  boost: 2, boosted: 2, boosting: 2,

  // Level 3: High ownership
  lead: 3, led: 3, leading: 3, "lead all": 3, "led all": 3,
  own: 3, owned: 3, owning: 3, "own all": 3, "owned all": 3,
  manage: 3, managed: 3, managing: 3, "manage all": 3, "managed all": 3,
  direct: 3, directed: 3, directing: 3,
  drive: 3, drove: 3, driving: 3, "drive all": 3, "drove all": 3,
  head: 3, headed: 3, heading: 3,
  spearhead: 3, spearheaded: 3, spearheading: 3,
  architect: 3, architected: 3, architecting: 3,
};

export const VERB_ORDER = Object.keys(VERB_LEVELS).sort((a, b) => b.length - a.length);

const VERB_REGEX = new RegExp(
  `\\b(?:${VERB_ORDER.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

export function findVerbs(text: string): Array<{ word: string; level: number }> {
  const matches: Array<{ word: string; level: number }> = [];
  for (const match of text.matchAll(VERB_REGEX)) {
    const raw = match[0].toLowerCase();
    const level = VERB_LEVELS[raw] ?? 0;
    if (level > 0) {
      matches.push({ word: match[0], level });
    }
  }
  return matches;
}

export const TEAM_FRAMING_REGEX = /\b(?:as part of a team|as part of the team|part of a team|part of the team|with a team of \d+|collaborated with|collaborating with|alongside)\b/i;

export const CAUSAL_JOIN_REGEX = /\b(?:which\s+drove|resulting\s+in|leading\s+to|that\s+(?:raised|cut|reduced|increased|boosted|improved|lowered|saved)|which\s+(?:raised|cut|reduced|increased|boosted|improved|lowered|saved)|helping\s+(?:cut|reduce|raise|boost|improve|lower|save)|thanks\s+to|so\s+that|enabling|causing|thereby)\b/i;

export const SCOPE_DOMAIN_QUALIFIERS = [
  "global", "enterprise", "urban", "gifted", "critical-care", "critical care",
  "international", "real-time", "realtime", "distributed", "high-scale", "large-scale",
  "fortune 500", "fortune 100", "conglomerate", "multinational", "worldwide", "nationwide",
  "multi-tenant", "mission-critical", "mission critical", "high-concurrency", "low-latency",
  "high-throughput", "fault-tolerant", "high-availability", "highly-available", "cross-functional",
  "cross-border", "cloud-native",
  "payment", "payments", "billing", "checkout", "payroll", "invoicing",
  "healthcare", "clinical", "medical", "biotech", "pharma", "pharmaceutical", "hipaa", "ehr", "emr",
  "fintech", "banking", "wealth", "lending", "insurtech",
  "ecommerce", "e-commerce", "merchandising",
  "crypto", "cryptocurrency", "blockchain", "web3", "defi",
  "aerospace", "automotive", "telecommunications", "telecom",
  "proptech", "edtech", "adtech", "cybersecurity", "infosec",
];

const QUALIFIER_REGEX = new RegExp(
  `\\b(?:${SCOPE_DOMAIN_QUALIFIERS.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+")).join("|")})\\b`,
  "gi",
);

export function findQualifiers(text: string): string[] {
  const matches: string[] = [];
  for (const m of text.matchAll(QUALIFIER_REGEX)) {
    matches.push(m[0].toLowerCase());
  }
  return [...new Set(matches)];
}

export const TITLE_WORDS = [
  "Supervisor", "Coordinator", "Director", "Manager", "Lead", "Head", "Architect",
  "Officer", "VP", "President", "Engineer", "Analyst", "Consultant", "Specialist",
  "Administrator", "Nurse", "Scientist", "Designer", "Teacher", "Instructor", "Counselor",
  "Educator", "Accountant", "Auditor", "Recruiter",
];

const TITLE_REGEX = new RegExp(
  `\\b(?:head of\\s+[a-zA-Z]+|(?:senior|junior|lead|principal|staff|executive|chief|assistant|associate|deputy)\\s+)*(?:${TITLE_WORDS.join("|")})\\b`,
  "gi",
);

export const CREDENTIALS_DEGREES = [
  "CCRN", "PMP", "CPA", "CFA", "CISSP", "CKA", "RN", "BSN", "MSN", "MBA", "PhD", "Ph.D.",
  "M.Sc.", "B.Sc.", "MSc", "BSc", "M.S.", "B.S.", "M.A.", "B.A.", "MD", "M.D.",
  "Bachelor", "Master", "Doctorate", "Certified ScrumMaster", "CSM",
];

const CREDENTIAL_REGEX = new RegExp(
  `\\b(?:${CREDENTIALS_DEGREES.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

export const COMMON_SENTENCE_STARTERS = new Set([
  "i", "we", "my", "our", "the", "this", "these", "those", "in", "on", "at", "to", "for", "with",
  "by", "from", "as", "during", "before", "after", "under", "over", "across", "between",
  "built", "build", "building", "developed", "develop", "developing", "implemented", "implement", "implementing",
  "wrote", "write", "writing", "designed", "design", "designing", "operated", "operate", "operating",
  "coordinated", "coordinate", "coordinating", "shipped", "ship", "shipping", "created", "create", "creating",
  "deployed", "deploy", "deploying", "maintained", "maintain", "maintaining", "tested", "test", "testing",
  "refactored", "refactor", "refactoring", "resolved", "resolve", "resolving", "streamlined", "streamline", "streamlining",
  "used", "use", "using", "utilize", "utilized", "utilizing", "applied", "apply", "applying",
  "led", "leading", "managed", "manage", "managing", "directed", "direct", "directing",
  "drove", "drive", "driving", "owned", "own", "owning", "headed", "heading",
  "spearheaded", "spearhead", "spearheading", "architected", "architect", "architecting",
  "worked", "work", "working", "helped", "help", "helping", "assisted", "assist", "assisting",
  "supported", "support", "supporting", "contributed", "contribute", "contributing",
  "collaborated", "collaborate", "collaborating", "partnered", "partner", "partnering",
  "reduced", "reduce", "reducing", "cut", "cutting", "increased", "increase", "increasing",
  "raised", "raise", "raising", "handled", "handle", "handling", "ran", "run", "running",
  "closed", "close", "closing", "saved", "save", "saving", "earned", "earn", "earning",
  "achieved", "achieve", "achieving", "delivered", "deliver", "delivering",
  "served", "serve", "serving", "provided", "provide", "providing",
  "conducted", "conduct", "conducting", "performed", "perform", "performing",
  "ensured", "ensure", "ensuring", "monitored", "monitor", "monitoring",
  "improved", "improve", "improving", "boosted", "boost", "boosting",
  "guided", "guide", "guiding", "trained", "train", "training",
  "mentored", "mentor", "mentoring", "taught", "teach", "teaching",
  "oversaw", "oversee", "overseeing", "supervised", "supervise", "supervising",
  "established", "establish", "establishing", "introduced", "introduce", "introducing",
  "organized", "organize", "organizing", "administered", "administer", "administering",
  "executed", "execute", "executing", "facilitated", "facilitate", "facilitating",
  "instructed", "instruct", "instructing", "authored", "author", "authoring",
  "automated", "automate", "automating", "integrated", "integrate", "integrating",
  "tracked", "track", "tracking", "negotiated", "negotiate", "negotiating",
  "identified", "identify", "identifying", "prepared", "prepare", "preparing",
  "dear", "sincerely", "thank", "best", "experience", "education", "skills", "summary",
  "list", "revamped", "revamp", "revamping", "through", "held", "hold", "holding",
  "responsibilities", "responsibility", "responsible", "proven", "proficient",
  "key", "core", "daily", "weekly", "monthly", "quarterly", "annual",
  "successfully", "successful", "active", "primary", "general", "advanced", "standard",
  "certified", "licensed", "expert", 
]);

export function isStarterContext(preceding: string): boolean {
  if (!preceding) return true;
  return /[-•*▪–—\t.!?:;("‘“\/\\]\s*$/.test(preceding);
}

export function isVerbOrCommonStarterWord(word: string, fullSentence: string): boolean {
  const w = word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!w) return false;
  if (COMMON_SENTENCE_STARTERS.has(w)) return true;
  if (findVerbs(w).length > 0) return true;
  if (w in VERB_LEVELS) return true;
  // Morphology check: common verb/adjective endings
  if (/^(?:[a-z]+ed|[a-z]+ing|[a-z]+ize[ds]?|[a-z]+ise[ds]?|[a-z]+ate[ds]?|[a-z]+en)$/i.test(w) && w.length >= 4) {
    return true;
  }
  // Check if the lowercase form appears elsewhere in the sentence or as a common dictionary word
  const lowerSentence = fullSentence.toLowerCase();
  const wordIdx = lowerSentence.indexOf(w);
  if (wordIdx !== -1) {
    const nextIdx = lowerSentence.indexOf(w, wordIdx + w.length);
    if (nextIdx !== -1) return true;
  }
  return false;
}

export interface ExtractedEntities {
  properNames: string[];
  credentials: string[];
  titles: string[];
  capitalizedTokens: string[];
}

export function extractEntities(sentence: string): ExtractedEntities {
  // Multiword proper names
  const properNames: string[] = [];
  const PROPER_NAME_REGEX = /\b[A-Z][\w&'/-]*(?:[ \t]+[A-Z][\w&'/-]*){1,4}\b/g;
  for (const match of sentence.matchAll(PROPER_NAME_REGEX)) {
    const raw = match[0].trim();
    const preceding = sentence.slice(0, match.index).trimEnd();
    const words = raw.split(/\s+/);
    if (!preceding || /[.!?:;]$/.test(preceding)) {
      if (COMMON_SENTENCE_STARTERS.has(words[0].toLowerCase())) {
        words.shift();
      }
    }
    if (words.length >= 2) {
      properNames.push(words.join(" "));
    }
  }

  // Credentials and degrees
  const credentials: string[] = [];
  for (const match of sentence.matchAll(CREDENTIAL_REGEX)) {
    credentials.push(match[0].trim());
  }

  // Titles
  const titles: string[] = [];
  for (const match of sentence.matchAll(TITLE_REGEX)) {
    titles.push(match[0].trim());
  }

  // Capitalized individual tokens
  const capitalizedTokens: string[] = [];
  const TOKEN_REGEX = /\b[A-Z][a-zA-Z0-9+#.-]*\b/g;
  for (const match of sentence.matchAll(TOKEN_REGEX)) {
    const token = match[0].trim();
    const start = match.index ?? 0;
    const preceding = sentence.slice(0, start).trimEnd();
    const isStartOfSentence = isStarterContext(preceding);

    if (isStartOfSentence && isVerbOrCommonStarterWord(token, sentence)) {
      continue;
    }
    // Skip if single letter unless I or A
    if (token.length <= 1) continue;
    if (new Set(["summary", "experience", "education", "skills", "projects", "certifications", "section"]).has(token.toLowerCase())) continue;

    capitalizedTokens.push(token);
  }

  return {
    properNames: [...new Set(properNames)],
    credentials: [...new Set(credentials)],
    titles: [...new Set(titles)],
    capitalizedTokens: [...new Set(capitalizedTokens)],
  };
}

export function isEntitySupported(
  entity: string,
  citedTexts: string[],
  options?: { isCoverLetter?: boolean; framingWords?: Set<string> },
): boolean {
  const normEntity = entity.toLowerCase().trim();
  const fullCited = citedTexts.join(" \n ").toLowerCase();

  // 1. Direct match (substring or whole word)
  const escaped = normEntity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "i").test(fullCited)) {
    return true;
  }
  if (fullCited.includes(normEntity)) {
    return true;
  }

  // 2. Acronym / Synonym table
  const group = lookupSynonymGroup(entity);
  if (group) {
    for (const form of group.forms) {
      const normForm = form.toLowerCase();
      const esc = normForm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(?<![\\w-])${esc}(?![\\w-])`, "i").test(fullCited)) {
        return true;
      }
      if (fullCited.includes(normForm)) {
        return true;
      }
    }
  }

  // 3. Part-of-compound rule: "CRM" (Salesforce CRM), "ERP" (SAP ERP), "EHR" (Epic EHR), etc.
  const GENERIC_SYSTEM_ACRONYMS = /\b(?:crm|erp|ehr|emr|api|sdk|cli|ui|ux|bi)\b/i;
  if (GENERIC_SYSTEM_ACRONYMS.test(entity)) {
    const words = entity.split(/\s+/);
    const nonGenericWords = words.filter((w) => !GENERIC_SYSTEM_ACRONYMS.test(w));
    if (
      nonGenericWords.length > 0 &&
      nonGenericWords.every((w) => new RegExp(`(?<![\\w-])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "i").test(fullCited))
    ) {
      return true;
    }
  }

  // 4. Degree equivalents: B.Sc. <-> BSc <-> B.S. <-> Bachelor of Science
  if (/\b(?:b\.sc\.?|bsc|b\.s\.?|bachelor(?:'s)?)\b/i.test(entity)) {
    if (/\b(?:b\.sc\.?|bsc|b\.s\.?|bachelor(?:'s)?)\b/i.test(fullCited)) return true;
  }
  if (/\b(?:m\.sc\.?|msc|m\.s\.?|master(?:'s)?)\b/i.test(entity)) {
    if (/\b(?:m\.sc\.?|msc|m\.s\.?|master(?:'s)?)\b/i.test(fullCited)) return true;
  }

  // 5. Cover letter framing exception
  if (options?.isCoverLetter && options?.framingWords) {
    const words = normEntity.split(/[\s-]+/).filter((w) => w.length >= 2);
    if (words.length > 0 && words.every((w) => options.framingWords!.has(w))) {
      return true;
    }
  }

  return false;
}

export function checkScopeInflation(
  sentence: string,
  citedLines: Array<{ lineNum: number; raw: string; strongestVerbLevel: number; strongestVerbWord?: string }>,
): ChangeFlag | null {
  const sentenceVerbs = findVerbs(sentence);
  if (sentenceVerbs.length === 0) return null;

  // Strongest verb in sentence
  sentenceVerbs.sort((a, b) => b.level - a.level);
  const strongest = sentenceVerbs[0];

  let maxCitedLevel = 0;
  let maxCitedVerb = "";
  let lineOfMax = citedLines[0]?.lineNum ?? 1;

  for (const line of citedLines) {
    if (line.strongestVerbLevel > maxCitedLevel) {
      maxCitedLevel = line.strongestVerbLevel;
      maxCitedVerb = line.strongestVerbWord ?? "";
      lineOfMax = line.lineNum;
    }
  }

  if (maxCitedLevel > 0 && strongest.level > maxCitedLevel) {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const sVerb = cap(strongest.word);
    const cVerb = cap(maxCitedVerb);
    return {
      kind: "claim",
      value: sVerb,
      message: `Verify “${sVerb}”: '${sVerb}' claims more than '${cVerb}' in line ${lineOfMax}.`,
    };
  }

  return null;
}

export function checkTeamInflation(
  sentence: string,
  citedLines: Array<{ lineNum: number; raw: string; hasTeamFraming: boolean }>,
): ChangeFlag | null {
  const citedWithTeam = citedLines.find((l) => l.hasTeamFraming);
  if (!citedWithTeam) return null;

  const sentenceHasTeam = /\b(?:team|part of|collaborat[a-z]*|alongside|with a team|working with|with\s+(?:[a-zA-Z]+\s+)*(?:designers|engineers|managers|teams|developers|stakeholders|clients|peers|partners|colleagues|workers|nurses))\b/i.test(sentence);
  if (!sentenceHasTeam) {
    const verbs = findVerbs(sentence);
    const verb = verbs[0]?.word ?? "Work";
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const vCap = cap(verb);
    return {
      kind: "claim",
      value: vCap,
      message: `Verify “${vCap}”: '${vCap}' claims sole credit for work done as part of a team in line ${citedWithTeam.lineNum}.`,
    };
  }
  return null;
}

export function checkCausalJoins(
  sentence: string,
  citedLines: Array<{ lineNum: number; raw: string; hasCausalJoin: boolean }>,
): ChangeFlag | null {
  const match = sentence.match(CAUSAL_JOIN_REGEX);
  if (!match) return null;

  const phrase = match[0];
  const anyCitedHasCausal = citedLines.some((l) => l.hasCausalJoin);
  if (!anyCitedHasCausal) {
    return {
      kind: "claim",
      value: phrase,
      message: `Verify “${phrase}”: '${phrase}' links two separate facts.`,
    };
  }
  return null;
}

export function checkDomainQualifiers(
  sentence: string,
  citedTexts: string[],
): ChangeFlag[] {
  const qualifiers = findQualifiers(sentence);
  const flags: ChangeFlag[] = [];
  const fullCited = citedTexts.join(" \n ").toLowerCase();

  for (const q of qualifiers) {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+");
    const stem = q.endsWith("s") ? q.slice(0, -1) : q;
    const stemEsc = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+");
    const re = new RegExp(`\\b(?:${esc}|${stemEsc}|${stemEsc}s)\\b`, "i");
    if (!re.test(fullCited)) {
      flags.push({
        kind: "claim",
        value: q,
        message: `Verify “${q}”: '${q}' isn't in your resume.`,
      });
    }
  }
  return flags;
}
