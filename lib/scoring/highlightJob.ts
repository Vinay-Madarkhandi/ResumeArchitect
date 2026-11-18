import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { termPattern } from "@/lib/resume/termPattern";
import type { requirementEvidence } from "@/lib/tailoring/requirements";

export interface JobTerm {
  label: string;
  kind: "must" | "nice" | "keyword";
  matched: boolean;
}

export type JobSegment = { text: string; term?: JobTerm };

/**
 * Splits the job post into plain text and highlighted terms (requirements and
 * keywords, with whether the resume currently shows them). Overlaps resolve
 * to the earliest, then longest, match.
 */
export function highlightJob(text: string, job: JobAnalysis, report: ReturnType<typeof requirementEvidence>): JobSegment[] {
  const terms: Array<{ term: JobTerm; patterns: string[] }> = [
    ...job.requirements.map((r) => ({
      term: {
        label: r.label,
        kind: r.importance,
        matched: report.requirements.find((x) => x.id === r.id)?.matched ?? false,
      } as JobTerm,
      patterns: [r.label, ...r.aliases],
    })),
    ...job.keywords.map((k) => ({
      term: { label: k.term, kind: "keyword", matched: report.keywords.find((x) => x.term === k.term)?.matched ?? false } as JobTerm,
      patterns: [k.term, ...k.aliases],
    })),
  ];

  const hits: Array<{ start: number; end: number; term: JobTerm }> = [];
  for (const { term, patterns } of terms) {
    for (const p of patterns.filter((x) => x.trim())) {
      const re = new RegExp(termPattern(p).source, "gi");
      for (const m of text.matchAll(re)) hits.push({ start: m.index!, end: m.index! + m[0].length, term });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: JobSegment[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.start < pos) continue;
    if (h.start > pos) segments.push({ text: text.slice(pos, h.start) });
    segments.push({ text: text.slice(h.start, h.end), term: h.term });
    pos = h.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) });
  return segments;
}
