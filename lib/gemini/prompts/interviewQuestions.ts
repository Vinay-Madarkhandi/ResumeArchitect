import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { InterviewQuestionSetSchema, type InterviewQuestion } from "@/lib/schemas/career";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { uniqueIds } from "./uniqueIds";

const SYSTEM = `You prepare a candidate for interviews for one specific job. You get the
job's analysis, the job post when there is one, and the candidate's resume
(Markdown).

Write 9 questions an interviewer for this job is likely to ask this
candidate: 3 behavioral, 3 technical, and 3 role-specific.
- behavioral: past-behavior questions ("Tell me about a time…") aimed at the
  job's soft requirements and the situations the role will face.
- technical: questions that test the job's hard requirements at the level the
  role needs. Where the resume shows the skill, ask them to go deeper on what
  they did; where it doesn't, ask how they would approach it.
- role: questions about this role, team or domain: priorities in the first
  months, trade-offs the job will force, why this role.

For each question return:
- id: a short kebab-case slug.
- category: behavioral | technical | role.
- question: the question as the interviewer would say it.
- assessing: one or two sentences on what the interviewer is listening for.
- requirement: the job requirement label it probes, or null.

Never assume experience the resume doesn't show, and never put words in the
candidate's mouth.`;

export async function writeInterviewQuestions(
  model: JsonModel,
  input: { job: JobAnalysis; jobText: string | null; resumeMarkdown: string },
): Promise<InterviewQuestion[]> {
  const { job, jobText, resumeMarkdown } = input;
  const prompt = [
    `# Role\n${job.title}${job.company ? ` at ${job.company}` : ""}${job.seniority ? ` (${job.seniority})` : ""}\n${job.summary}`,
    `# Requirements\n${job.requirements.map((r) => `- ${r.label} (${r.importance === "must" ? "must-have" : "nice-to-have"}, ${r.category})`).join("\n")}`,
    jobText ? `# Job post\n${jobText.slice(0, 12_000)}` : "",
    `# Candidate's resume\n${resumeMarkdown}`,
  ].filter(Boolean).join("\n\n");
  const { questions } = await generateStructured(model, {
    label: "interviewQuestions",
    system: SYSTEM,
    prompt,
    schema: InterviewQuestionSetSchema,
    temperature: 0.5,
  });
  return uniqueIds(questions, "q");
}
