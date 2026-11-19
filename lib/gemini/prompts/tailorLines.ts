import { z } from "zod";
import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import type { MatchReport } from "@/lib/report/report";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { isLocked, type Unit } from "@/lib/resume/units";

/**
 * Tailoring works line by line: the resume is shown to the model as numbered
 * lines, and the model answers with edits that point at those numbers. That
 * anchors every change to a real line, so the app can explain, verify, and
 * revert each one, and the model cannot silently drop or restructure content.
 */
export const LineEditSchema = z.object({
  op: z.enum(["rewrite", "insert_after", "remove"]),
  /** Line number from the numbered resume. */
  line: z.number().int(),
  /** New inline Markdown for rewrite/insert_after; empty for remove. */
  text: z.string().default(""),
  /** One sentence tied to the job: why this edit helps. */
  reason: z.string(),
  /** Requirement ids from the job analysis this edit addresses. */
  requirementIds: z.array(z.string()).default([]),
});
export type LineEdit = z.infer<typeof LineEditSchema>;

export const TailorResponseSchema = z.object({
  /** Two or three sentences to the candidate about what was changed and why; never resume text. */
  summary: z.string(),
  edits: z.array(LineEditSchema),
});
export type TailorResponse = z.infer<typeof TailorResponseSchema>;

const SYSTEM = `You are an expert resume writer tailoring a candidate's real resume to one job.
You receive the resume as numbered lines, the job's requirements, and which of
them the resume already shows. Answer with targeted line edits.

Edit operations:
- rewrite: replace line N with new text. Keep the line's role: a bullet stays a
  bullet, a heading stays a heading.
- insert_after: add a new line after line N, of the same kind as line N. Use it
  for a new bullet or a new skills line, and only for content the resume
  already supports somewhere else.
- remove: delete line N. Use it rarely, only for content that is clearly
  irrelevant to this job and costs space.
Lines marked "locked" contain nested content: never rewrite or remove them
(you may insert_after them).

Hard rules, no exceptions:
1. Never invent experience. Do not add employers, titles, dates, degrees,
   certifications, tools, skills, projects, or achievements that the resume
   does not already state or directly imply.
2. Never invent or change numbers. Keep every existing metric exactly; never
   add a metric that is not in the resume.
3. Use the job's vocabulary only when the underlying claim is already true
   ("JS" → "JavaScript" is fine; adding Kubernetes the resume never mentions is not).
4. If a requirement is missing from the resume, do not fake it. Leave it for
   the candidate.
5. Leave the name, contact details, dates, employers, and section headings
   unchanged unless a heading is non-standard ("My Journey" → "Experience").
6. Inline formatting only: **bold**, _italic_, [text](url). No line breaks.
7. Never lose a specific. Every version, product, database, protocol, state
   name, scope detail, and number in the original line must survive the
   rewrite ("Spring Boot 4", "from a single-instance MySQL design",
   "UP / SUSPECT / DOWN", "receipt vouchers"). A rewrite may add job
   vocabulary around them, never replace them with a vaguer word.
8. Don't upgrade the claim. "a service" is not "microservices"; "built" is
   not "architected"; a first job is not "experienced" or a "proven track
   record". Match the seniority the dates show.
9. Keep tense: present for the current role, past for earlier ones.

Craft:
- Lead bullets with a strong, specific verb. Cut filler ("responsible for",
  "worked on", "team player") and never add any: no "robust", "comprehensive",
  "enhanced", "demonstrating", "leveraging", "proven", "track record".
- If a line already says what the job wants, leave it alone. An unchanged
  strong line beats a reworded weaker one.
- Surface the experience this job cares about: make the connection explicit.
- A sharp 15-word bullet beats a padded 30-word one.
- Rewrite the summary/profile paragraph, if there is one, to speak to this role.
- Prefer 4–15 meaningful edits. Skip cosmetic rewrites that add nothing.

Each edit's reason is one plain sentence a candidate can check, tied to the
job ("The posting asks for incident response; this bullet already shows it, now
it says so"). Never mention scores or percentages.`;

function kindLabel(u: Unit): string {
  if (u.kind === "heading") return `heading ${u.level}`;
  return isLocked(u) ? `${u.kind}, locked` : u.kind;
}

export function numberedResume(units: Unit[]): string {
  return units.map((u, i) => `[${i + 1}] (${kindLabel(u)}) ${u.markdown}`).join("\n");
}

export async function tailorLines(
  model: JsonModel,
  /** `report` scores the resume as it is now; its skills are the requirements the model sees. */
  input: { units: Unit[]; job: JobAnalysis; report: MatchReport },
): Promise<TailorResponse> {
  const { units, job, report } = input;
  const statusMap = new Map(
    [...report.hardSkills, ...report.softSkills].map((s) => [s.term.toLowerCase(), s.status]),
  );
  const reqs = job.requirements.length > 0 ? job.requirements : [...report.hardSkills, ...report.softSkills].map((s) => ({
    id: s.term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill",
    label: s.term,
    importance: (s.importance === "high" ? "must" : "nice") as "must" | "nice",
  }));
  const reqLines = reqs.map((r) => {
    const status = statusMap.get(r.label.toLowerCase()) === "missing" ? "NOT shown in resume" : "shown in resume";
    return `- ${r.id} · ${r.label} · ${r.importance === "must" ? "high" : "low"} importance · ${status}`;
  });
  const prompt = [
    `# Role\n${job.title}${job.company ? ` at ${job.company}` : ""}${job.seniority ? ` (${job.seniority})` : ""}\n${job.summary}`,
    `# Requirements\n${reqLines.join("\n")}`,
    report.otherKeywords.length ? `# Keywords recruiters search for\n${report.otherKeywords.map((k) => k.term).join(", ")}` : "",
    `# Resume (numbered lines)\n${numberedResume(units)}`,
    "Return the edits, and in summary tell the candidate in two or three sentences what you changed and why (not resume text), as JSON.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return generateStructured(model, { label: "tailorLines", system: SYSTEM, prompt, schema: TailorResponseSchema, temperature: 0.5 });
}
