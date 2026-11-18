import { SYNONYM_GROUPS, formKey } from "@/lib/report/synonyms";
import {
  extractFiguresWithMeasures,
  type FigureMatch,
} from "./figures";

// Build fast synonym lookups
const synonymGroupByForm = new Map<string, number>();
const synonymFormsByGroup: string[][] = [];

SYNONYM_GROUPS.forEach((group, idx) => {
  synonymFormsByGroup.push([...group.forms]);
  for (const form of group.forms) {
    synonymGroupByForm.set(formKey(form), idx);
    synonymGroupByForm.set(form.toLowerCase(), idx);
  }
});

// Extra technical terms/tools commonly appearing on resumes
const EXTRA_TOOLS = [
  "Rust", "Bash", "Shell", "Linux", "Git", "Kafka", "Docker", "Redis", "Python",
  "Java", "MySQL", "MongoDB", "PostgreSQL", "Postgres", "GraphQL", "Ruby", "PHP",
  "Swift", "Kotlin", "Scala", "C++", "C#", "HTML", "CSS", "Terraform", "Ansible",
  "Jenkins", "CircleCI", "Elasticsearch", "RabbitMQ", "Spark", "Airflow", "Hadoop",
  "Flink", "Cassandra", "DynamoDB", "Firebase", "Supabase", "Tailwind", "REST", "REST APIs", "gRPC",
  "OAuth", "OAuth2", "Pulsar", "Apache Pulsar", "Pandas", "NumPy", "PyTorch", "OpenAPI",
  "GitHub Actions", "CI pipelines",
];

for (const tool of EXTRA_TOOLS) {
  const k = formKey(tool);
  if (!synonymGroupByForm.has(k)) {
    const idx = synonymFormsByGroup.length;
    synonymFormsByGroup.push([tool]);
    synonymGroupByForm.set(k, idx);
    synonymGroupByForm.set(tool.toLowerCase(), idx);
  }
}

// All known tools, sorted longest-first
const ALL_TECH_TERMS = Array.from(
  new Set(synonymFormsByGroup.flat().concat(EXTRA_TOOLS))
).sort((a, b) => b.length - a.length);

const TECH_REGEX = new RegExp(
  `(?<![\\w.])(?:${ALL_TECH_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w.])`,
  "gi"
);

export const SENIORITY_WORDS = ["senior", "lead", "principal", "staff", "head of", "chief", "director", "vp", "junior", "intern"];

const TITLE_REGEX = /\bhead of\s+[a-zA-Z]+\b|\b(?:(?:senior|junior|lead|principal|staff|backend|frontend|full[- ]stack|software|platform|data|product|project|engineering|sales|operations)\s+)*(?:engineer|developer|designer|analyst|manager|architect|director|consultant|specialist|intern|founder|scientist|president)\b/gi;
const EMPLOYER_CORP_REGEX = /\b[A-Z][\w&'-]*(?:[ \t]+[A-Z][\w&'-]*){0,4}\s+(?:Inc\.?|Ltd\.?|LLC|Corp\.?|GmbH|Corporation)\b/g;
const EMPLOYER_AT_REGEX = /\b(?:at|for|@)\s+([A-Z][\w&'-]*(?:\s+[A-Z][\w&'-]*){0,3})\b/g;
const DEGREE_REGEX = /\b(?:B\.S\.?|B\.A\.?|BSc|BA|M\.S\.?|M\.A\.?|MSc|MA|PhD|Ph\.D\.|Bachelor(?:'s)?|Master(?:'s)?|Doctorate)\b(?:\s+(?:in|of)\s+([A-Z][\w\s&]+))?/gi;
const CERT_REGEX = /\b(?:AWS Certified\s+[A-Za-z\s]+|Certified\s+[A-Za-z\s]+|CKA|PMP|CISSP)\b/gi;

const DURATION_REGEX = /\b(\d+)\s+(years?|months?)\b/gi;
const DATE_YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/g;

const HIGH_OWNERSHIP_REGEX = /\b(?:led all|owned all|owned|led|architected|spearheaded|directed|managed all|drove all)\b/i;

const CAUSAL_JOIN_REGEX = /\b(?:that|which|thereby|resulting in|leading to)\s+(?:reduced|reduces|reducing|cut|cutting|increased|increasing|saved|saving|boosted|boosting|improved|improving|lowered|lowering)\b/i;

export interface ExtractedClaims {
  tools: string[];
  employers: string[];
  titles: string[];
  seniority: string[];
  degrees: { degree: string; field?: string }[];
  certifications: string[];
  durations: string[];
  years: string[];
  figures: FigureMatch[];
  hasHighOwnership: boolean;
  hasCausalJoin: boolean;
  hasNegation: boolean;
}

export function extractClaims(text: string): ExtractedClaims {
  const tools: string[] = [];
  for (const match of text.matchAll(TECH_REGEX)) {
    tools.push(match[0].trim());
  }

  const employers: string[] = [];
  for (const match of text.matchAll(EMPLOYER_CORP_REGEX)) {
    const clean = match[0].replace(/^(?:at|in|for|from|with|by|to|the)\s+/i, "").trim();
    if (clean) employers.push(clean);
  }
  for (const match of text.matchAll(EMPLOYER_AT_REGEX)) {
    const name = match[1].replace(/^(?:at|in|for|from|with|by|to|the)\s+/i, "").trim();
    if (name && !employers.includes(name) && !/^(?:the|this|a|an)\b/i.test(name)) {
      employers.push(name);
    }
  }

  const titles: string[] = [];
  for (const match of text.matchAll(TITLE_REGEX)) {
    titles.push(match[0].trim());
  }

  const seniority: string[] = [];
  for (const sen of SENIORITY_WORDS) {
    if (new RegExp(`\\b${sen}\\b`, "i").test(text)) {
      seniority.push(sen.toLowerCase());
    }
  }

  const degrees: { degree: string; field?: string }[] = [];
  for (const match of text.matchAll(DEGREE_REGEX)) {
    degrees.push({ degree: match[0].trim(), field: match[1]?.trim() });
  }

  const certifications: string[] = [];
  for (const match of text.matchAll(CERT_REGEX)) {
    certifications.push(match[0].trim());
  }

  const durations: string[] = [];
  for (const match of text.matchAll(DURATION_REGEX)) {
    durations.push(match[0].trim());
  }

  const figures = extractFiguresWithMeasures(text);

  const years: string[] = [];
  for (const match of text.matchAll(DATE_YEAR_REGEX)) {
    const yr = match[1];
    const isQuantity = figures.some((f) =>
      f.raw.replace(/,/g, "") === yr && f.headNoun && !["year", "years", "present"].includes(f.headNoun)
    );
    if (!isQuantity) {
      years.push(yr);
    }
  }

  const hasHighOwnership = HIGH_OWNERSHIP_REGEX.test(text);
  const hasCausalJoin = CAUSAL_JOIN_REGEX.test(text);
  const hasNegation = /\b(?:never|didn't|did not|not|cannot|couldn't)\b/i.test(text);

  return {
    tools: [...new Set(tools)],
    employers: [...new Set(employers)],
    titles: [...new Set(titles)],
    seniority: [...new Set(seniority)],
    degrees,
    certifications: [...new Set(certifications)],
    durations: [...new Set(durations)],
    years: [...new Set(years)],
    figures,
    hasHighOwnership,
    hasCausalJoin,
    hasNegation,
  };
}

/** Check if tool T is supported in source text */
export function isToolSupported(tool: string, sourceText: string): boolean {
  const k = formKey(tool);
  const groupId = synonymGroupByForm.get(k) ?? synonymGroupByForm.get(tool.toLowerCase());
  if (groupId !== undefined) {
    const forms = synonymFormsByGroup[groupId] ?? [tool];
    return forms.some((f) => {
      const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, "i").test(sourceText);
    });
  }
  const escaped = tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, "i").test(sourceText);
}

/** Check if title is supported in source, including seniority */
export function isTitleSupported(title: string, sourceText: string): boolean {
  const sourceLower = sourceText.toLowerCase();

  // Check if title introduces seniority not present in source
  for (const sen of SENIORITY_WORDS) {
    if (new RegExp(`\\b${sen}\\b`, "i").test(title)) {
      if (!new RegExp(`\\b${sen}\\b`, "i").test(sourceLower)) {
        return false;
      }
    }
  }

  // Check core title words (engineer, developer, etc.)
  const coreTitleMatch = title.match(/\b(engineer|developer|designer|analyst|manager|architect|director|consultant|specialist|intern|founder|scientist|president)\b/i);
  if (coreTitleMatch) {
    const role = coreTitleMatch[1].toLowerCase();
    if (!sourceLower.includes(role)) {
      return false;
    }
  }
  return true;
}

/** Check if employer/organization is in source */
export function isEmployerSupported(employer: string, sourceText: string): boolean {
  const noPrep = employer.replace(/^(?:at|in|for|from|with|by|to|the)\s+/i, "").trim();
  const clean = noPrep.toLowerCase().replace(/\s+(?:inc\.?|ltd\.?|llc|corp\.?|corporation)\b/g, "").trim();
  const sourceClean = sourceText.toLowerCase();
  return sourceClean.includes(noPrep.toLowerCase()) || (clean.length >= 3 && sourceClean.includes(clean));
}

/** Check if degree/certification is in source */
export function isDegreeSupported(degree: { degree: string; field?: string }, sourceText: string): boolean {
  const sourceLower = sourceText.toLowerCase();
  const degLower = degree.degree.toLowerCase();

  // Check degree abbreviation/name
  if (/\b(?:ph\.?d\.?|doctorate)\b/i.test(degLower) && !/\b(?:ph\.?d\.?|doctorate)\b/i.test(sourceLower)) return false;
  if (/\b(?:m\.?s\.?|msc|master(?:'s)?)\b/i.test(degLower) && !/\b(?:m\.?s\.?|msc|master(?:'s)?|m\.?a\.?)\b/i.test(sourceLower)) return false;
  if (/\b(?:b\.?s\.?|bsc|bachelor(?:'s)?)\b/i.test(degLower) && !/\b(?:b\.?s\.?|bsc|bachelor(?:'s)?|b\.?a\.?)\b/i.test(sourceLower)) return false;

  // Check field of study if specified
  if (degree.field) {
    const fieldLower = degree.field.toLowerCase();
    if (!sourceLower.includes(fieldLower)) {
      // Check if any major field word is in source
      const words = fieldLower.split(/\s+/).filter((w) => w.length >= 3);
      if (!words.some((w) => sourceLower.includes(w))) return false;
    }
  }
  return true;
}
