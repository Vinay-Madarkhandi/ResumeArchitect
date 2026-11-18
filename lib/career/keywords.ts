import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { KeywordHit } from "@/lib/schemas/career";
import { termPattern } from "@/lib/scoring/score";

/**
 * Finds each of the job's requirements and keywords in named sections of the
 * user's text, using the same whole-token matching as the resume score.
 */
export function matchKeywords(job: JobAnalysis, sections: Record<string, string>): KeywordHit[] {
  const terms = [
    ...job.requirements.map((r) => ({ term: r.label, aliases: r.aliases, kind: r.importance })),
    ...job.keywords.map((k) => ({ term: k.term, aliases: k.aliases, kind: "keyword" as const })),
  ];
  const seen = new Set<string>();
  return terms.flatMap(({ term, aliases, kind }) => {
    const key = term.trim().toLowerCase();
    if (!key || seen.has(key)) return [];
    seen.add(key);
    const patterns = [term, ...aliases].filter((t) => t.trim()).map(termPattern);
    const where = Object.entries(sections)
      .filter(([, text]) => patterns.some((p) => p.test(text)))
      .map(([name]) => name);
    return [{ term, kind, found: where.length > 0, where }];
  });
}

export function keywordRatio(hits: KeywordHit[]): number | null {
  if (!hits.length) return null;
  // Must-haves count double: they're what a recruiter filters on first.
  const weight = (h: KeywordHit) => (h.kind === "must" ? 2 : 1);
  const total = hits.reduce((sum, h) => sum + weight(h), 0);
  return hits.filter((h) => h.found).reduce((sum, h) => sum + weight(h), 0) / total;
}
