import type { ResumeLine } from "./extractLines";
import { matchSectionHeader, type SectionKind } from "./patterns";

export interface ResumeSegment {
  kind: SectionKind | "header" | "unknown";
  headerLine?: ResumeLine;
  lines: ResumeLine[];
}

/**
 * Splits the document's lines into segments at recognized section headers.
 * Everything before the first recognized header is the "header" segment
 * (name / contact info). A line matching multiple keyword lists never
 * happens by construction of matchSectionHeader (first match wins), and an
 * unrecognized heading-like line stays inside the current segment rather
 * than being dropped — better to over-include than silently lose content.
 */
export function splitIntoSegments(lines: ResumeLine[]): ResumeSegment[] {
  const segments: ResumeSegment[] = [{ kind: "header", lines: [] }];

  for (const line of lines) {
    const headerMatch = matchSectionHeader(line.text);
    if (headerMatch) {
      segments.push({ kind: headerMatch, headerLine: line, lines: [] });
    } else {
      segments[segments.length - 1].lines.push(line);
    }
  }

  return segments.filter((s) => s.lines.length > 0 || s.kind !== "header");
}

/** Merge all segments matching a given section kind (some resumes repeat/split a section across pages). */
export function segmentsOfKind(segments: ResumeSegment[], kind: SectionKind): ResumeLine[] {
  return segments.filter((s) => s.kind === kind).flatMap((s) => s.lines);
}
