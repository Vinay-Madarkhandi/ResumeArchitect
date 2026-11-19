import { groundInterviewQuestion } from "@/lib/grounding/interview";
import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreAnswer } from "@/lib/career/interview";
import { addInterviewAnswer, getInterviewSession } from "@/lib/data/interview";
import { rateAnswer } from "@/lib/gemini/prompts/rateAnswer";
import { InterviewQuestionSchema, MAX_ANSWER_LENGTH } from "@/lib/schemas/career";
import { JobAnalysisSchema } from "@/lib/schemas/jobAnalysis";
import { careerRequest } from "@/lib/server/careerRequest";
import { aiFailure, aiModel, groundingResume } from "@/lib/server/careerTarget";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(20, "Write or dictate a fuller answer first.").max(MAX_ANSWER_LENGTH, "That answer is too long."),
});

/** Rates a practice answer and stores it with its feedback. */
export async function POST(request: Request, { params }: RouteContext<"/api/career/interview/[id]/answers">) {
  const req = await careerRequest(request, Body);
  if (!req.ok) return req.response;
  const { userId, body } = req.value;
  const { id } = await params;

  const session = await getInterviewSession(userId, id);
  const job = JobAnalysisSchema.safeParse(session?.job_analysis);
  const question = z.array(InterviewQuestionSchema).safeParse(session?.questions).data?.find((q) => q.id === body.questionId);
  if (!session || !job.success || !question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const resume = await groundingResume(userId, session.resume_id);
  if (!resume.ok) return resume.response;
  const model = await aiModel(userId, "interview-answer", 60);
  if (!model.ok) return model.response;

  try {
    const safe = question.grounded
      ? question
      : groundInterviewQuestion(question, resume.value.markdown, job.data.requirements.map((r) => r.label));
    const rating = await rateAnswer(model.value, { job: job.data, question: safe, answer: body.answer, resumeMarkdown: resume.value.markdown });
    const feedback = { ...scoreAnswer(body.answer, rating), grounded: true as const };
    const saved = await addInterviewAnswer(userId, id, { question_id: question.id, answer: body.answer, feedback, score: feedback.score.total });
    return NextResponse.json({ id: saved?.id, createdAt: saved?.created_at, feedback });
  } catch (error) {
    return aiFailure(error, "Couldn't rate that answer. Try again.");
  }
}
