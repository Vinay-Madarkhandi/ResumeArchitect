import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { JobFactsSchema, type JobFacts } from "@/lib/schemas/jobFacts";
import { groundJobSkills } from "@/lib/report/keywords";

const SYSTEM = `You are an applicant tracking system's job-posting parser. Read one job
posting and return the facts a recruiter screens resumes against. Never score
or judge a resume; you only read the posting.

Return:
- title: the role title as the posting writes it, without location, team
  codes, or requisition numbers ("Senior Backend Engineer").
- level: "entry" (intern, junior, associate, new grad, 0–2 years),
  "mid" (2–5 years, no seniority word), "senior" (senior, lead, staff,
  principal, 5+ years), or "executive" (director, head of, VP, C-level).
- hardSkills: 0 to 25 technical or job-specific skills: tools, technologies,
  methods, certifications, and domain knowledge ("Python", "GAAP",
  "financial modeling", "PMP"). Write each term exactly as the posting does,
  keeping its spelling and acronyms, in 1–4 words. One entry per skill: do
  not list both "JS" and "JavaScript". Each has an importance:
  - "high": in the title, under required or must-have qualifications, or
    mentioned three or more times.
  - "medium": in the responsibilities or requirements, mentioned once or twice.
  - "low": preferred, nice to have, bonus, or "a plus".
- softSkills: 0 to 10 interpersonal or work-style skills the posting asks for
  ("communication", "leadership", "stakeholder management"), worded as the
  posting words them, with importance by the same rules.
- education: the lowest degree the posting requires or prefers, as
  { degree, fields, equivalentExperience }. degree is high_school, associate,
  bachelor, master, or doctorate. fields lists the fields of study it names
  (empty when any field will do). equivalentExperience is true when it accepts
  experience instead. null when the posting names no degree.
- yearsRequired: the minimum years of experience the posting asks for
  ("3+ years" is 3, "3–5 years" is 3), or null when it gives none.
- predictedSkills: 0 to 8 skills that people in this exact role usually need
  but this posting never mentions, each with a one-sentence reason. Never
  repeat a skill the posting names, in any spelling.

Use empty arrays when there are no skills of that type. Never invent listed skills.

Skip benefits, salary, equal-opportunity statements, and company history.`;

/**
 * Reads a job posting into the facts the Match Report scores against
 * (lib/report). The AI extracts; it never produces the match rate.
 */
export async function extractJobFacts(model: JsonModel, jobText: string): Promise<JobFacts> {
  const facts = await generateStructured(model, {
    label: "extractJobFacts",
    system: SYSTEM,
    prompt: `# Job posting\n\n${jobText.trim()}`,
    schema: JobFactsSchema,
    temperature: 0.1,
  });

  return groundJobSkills(facts, jobText);
}
