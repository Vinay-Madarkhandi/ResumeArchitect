import { z } from "zod";
import { groundAnswerRating } from "@/lib/grounding/interview";
import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { AnswerRatingSchema, type AnswerRating, type InterviewQuestion } from "@/lib/schemas/career";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";

const RatingDraft = AnswerRatingSchema.extend({
  starEvidence: z.object({
    situation: z.string().optional(),
    task: z.string().optional(),
    action: z.string().optional(),
    result: z.string().optional(),
  }).optional(),
});

const SYSTEM = `You coach a candidate on one practice interview answer. You get the job,
the question with what the interviewer is assessing, the candidate's resume,
and their answer (typed or transcribed from speech, so ignore filler words
and transcription slips).

Rate the answer:
- star: whether each part is present. situation = the context; task = their
  responsibility or the problem; action = what they personally did; result =
  the outcome. For technical questions read them as context, problem,
  approach, and outcome or trade-off.
- specificity, 1–5: 1 = generalities only; 3 = some concrete detail;
  5 = concrete actions, tools, names and numbers from their own work.
- relevance, 1–5: 1 = doesn't answer the question; 3 = answers it loosely;
  5 = answers it directly and connects to what the job needs.
- starEvidence: one complete verbatim sentence from their answer for each
  STAR part marked present. Omit any part with no direct evidence.
- strengths: up to 3 complete verbatim sentences from their answer that
  work particularly well. Return only the quotes, without commentary.
- improvements: up to 3 specific, actionable fixes. Suggest details only
  from their resume; never invent experience or numbers for them.

Judge only the answer given. Be direct and kind.`;

export async function rateAnswer(
  model: JsonModel,
  input: { job: JobAnalysis; question: InterviewQuestion; answer: string; resumeMarkdown: string },
): Promise<AnswerRating> {
  const { job, question, answer, resumeMarkdown } = input;
  const prompt = [
    `# Role\n${job.title}${job.company ? ` at ${job.company}` : ""}\n${job.summary}`,
    `# Question (${question.category})\n${question.question}`,
    `# What the interviewer is assessing\n${question.assessing}`,
    `# Candidate's resume\n${resumeMarkdown}`,
    `# Their answer\n${answer.trim()}`,
  ].join("\n\n");
  const draft = await generateStructured(model, {
    label: "rateAnswer",
    system: SYSTEM,
    prompt,
    schema: RatingDraft,
    temperature: 0.2,
  });
  return groundAnswerRating(answer, draft);
}
