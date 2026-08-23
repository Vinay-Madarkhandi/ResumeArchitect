import { extractResumeLines } from "./extractLines";
import { splitIntoSegments, segmentsOfKind } from "./segments";
import { parseContactBlock } from "./parseContact";
import { parseExperienceSection } from "./parseExperience";
import { parseProjectsSection } from "./parseProjects";
import { parseEducationSection } from "./parseEducation";
import { parseSkillsSection } from "./parseSkills";
import { parseCertificationsSection } from "./parseCertifications";
import { ResumeContentSchema, type ResumeContent } from "@/lib/schemas/resume";

export interface ParseResumeResult {
  content: ResumeContent;
  lowConfidenceFields: string[];
}

export class ResumeParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "ResumeParseError";
  }
}

/**
 * Deterministic, heuristic PDF -> structured resume parser. No LLM call and
 * no API key required, so it works during onboarding before a Gemini key
 * exists (see AGENTS plan: parsing must not depend on Gemini). Anything the
 * heuristics can't confidently populate is left empty and its path recorded
 * in lowConfidenceFields for the review UI — never guessed or fabricated.
 */
export async function parseResumeFile(fileBuffer: ArrayBuffer): Promise<ParseResumeResult> {
  let lines;
  try {
    lines = await extractResumeLines(fileBuffer);
  } catch (error) {
    throw new ResumeParseError("Could not read this PDF. It may be corrupt, password-protected, or a scanned image.", error);
  }

  if (lines.length === 0) {
    throw new ResumeParseError(
      "No extractable text was found in this PDF. Scanned/image-only resumes aren't supported yet — please upload a text-based PDF.",
    );
  }

  const segments = splitIntoSegments(lines);
  const headerSegment = segments.find((s) => s.kind === "header");

  const { personalInfo, lowConfidenceFields: contactLowConfidence } = parseContactBlock(
    headerSegment?.lines ?? [],
  );

  const summaryLines = segmentsOfKind(segments, "summary");
  const summary = summaryLines.length > 0 ? summaryLines.map((l) => l.text).join(" ").trim() : null;

  const { experience, lowConfidenceFields: experienceLowConfidence } = parseExperienceSection(
    segmentsOfKind(segments, "experience"),
  );
  const { projects, lowConfidenceFields: projectsLowConfidence } = parseProjectsSection(
    segmentsOfKind(segments, "projects"),
  );
  const { education, lowConfidenceFields: educationLowConfidence } = parseEducationSection(
    segmentsOfKind(segments, "education"),
  );
  const { skills, lowConfidenceFields: skillsLowConfidence } = parseSkillsSection(
    segmentsOfKind(segments, "skills"),
  );
  const { certifications, lowConfidenceFields: certificationsLowConfidence } = parseCertificationsSection(
    segmentsOfKind(segments, "certifications"),
  );

  const lowConfidenceFields = [
    ...contactLowConfidence,
    ...(summary ? [] : ["summary"]),
    ...experienceLowConfidence,
    ...projectsLowConfidence,
    ...educationLowConfidence,
    ...skillsLowConfidence,
    ...certificationsLowConfidence,
  ];

  if (experience.length === 0) lowConfidenceFields.push("experience");
  if (education.length === 0) lowConfidenceFields.push("education");

  const candidate: ResumeContent = {
    personalInfo,
    summary,
    experience,
    projects,
    education,
    skills,
    certifications,
  };

  const result = ResumeContentSchema.safeParse(candidate);
  if (!result.success) {
    throw new ResumeParseError("Parsed resume data did not match the expected shape.", result.error);
  }

  return { content: result.data, lowConfidenceFields };
}
