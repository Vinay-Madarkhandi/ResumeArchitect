import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { JobAnalysisSchema, type JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { uniqueIds } from "./uniqueIds";

const SYSTEM = `You are a senior technical recruiter. Read a job description and extract
what a hiring manager will actually screen for.

Return:
- title: the role title as written in the posting.
- company: the hiring company, or null when the posting does not name it.
- seniority: e.g. "Junior", "Mid-level", "Senior", "Staff", "Lead", or null.
- summary: two plain sentences on what the role is really about.
- requirements: 6 to 16 concrete requirements, most important first. Each has
  - id: a short kebab-case slug, unique within the list.
  - label: the requirement as a recruiter would search for it ("Kubernetes",
    "B2B SaaS sales", "Bachelor's in Computer Science"). Keep labels to 1–4 words.
  - aliases: other spellings or close equivalents a resume might use
    ("K8s" for "Kubernetes", "Postgres" for "PostgreSQL"). Never list broader or
    different skills as aliases.
  - importance: "must" when the posting requires it, "nice" when it is a plus.
  - category: skill | tool | domain | qualification | soft.
- keywords: 4 to 12 responsibility or domain phrases a recruiter would search
  for that are not already requirements ("payments", "incident response"),
  each with aliases.

Prefer specific, checkable items over vague traits. Skip boilerplate such as
benefits, equal-opportunity statements, and company history.`;

export async function analyzeJob(model: JsonModel, jobDescription: string): Promise<JobAnalysis> {
  const result = await generateStructured(model, {
    label: "analyzeJob",
    system: SYSTEM,
    prompt: `# Job description\n\n${jobDescription.trim()}`,
    schema: JobAnalysisSchema,
    temperature: 0.2,
  });
  return { ...result, requirements: uniqueIds(result.requirements, "req") };
}
