import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { JobAnalysisSchema, type JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { uniqueIds } from "./uniqueIds";

const SYSTEM = `You are a senior technical recruiter. The candidate names a role they are
targeting but has no specific job post. List the typical requirements for that
role as most postings for it state them.

Return:
- title: the role as the candidate wrote it, cleaned up.
- company: null.
- seniority: the level the title implies, or null.
- summary: two plain sentences on what the role usually involves.
- requirements: 6 to 12 requirements most postings for this role share, most
  common first. Each has an id (short kebab-case slug), a label a recruiter
  would search for (1–4 words), aliases (other spellings, never broader
  skills), importance ("must" if nearly every posting asks for it, "nice"
  otherwise), and a category (skill | tool | domain | qualification | soft).
- keywords: 4 to 10 responsibility or domain phrases recruiters search for
  with this role, each with aliases.

Prefer concrete, checkable items over traits.`;

export async function analyzeRole(model: JsonModel, role: string): Promise<JobAnalysis> {
  const result = await generateStructured(model, {
    label: "analyzeRole",
    system: SYSTEM,
    prompt: `# Target role\n\n${role.trim()}`,
    schema: JobAnalysisSchema,
    temperature: 0.2,
  });
  return { ...result, company: null, requirements: uniqueIds(result.requirements, "req") };
}
