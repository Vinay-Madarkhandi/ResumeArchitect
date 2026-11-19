import { scoreAnswer } from "@/lib/career/interview";
import { groundAnswerRating, groundInterviewQuestion } from "@/lib/grounding/interview";
import { JobAnalysisSchema } from "@/lib/schemas/jobAnalysis";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { InterviewPractice } from "@/components/career/InterviewPractice";
import { KeyMissing } from "@/components/career/Report";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { getInterviewSession, listInterviewAnswers } from "@/lib/data/interview";
import { getProfileStatus } from "@/lib/data/profiles";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { AnswerFeedbackSchema, InterviewQuestionSetSchema } from "@/lib/schemas/career";

export const metadata: Metadata = { title: "Interview practice" };

export default async function InterviewSessionPage({ params }: PageProps<"/interview/[id]">) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const [session, answers, profile] = await Promise.all([
    getInterviewSession(user.id, id), listInterviewAnswers(user.id, id), getProfileStatus(user.id),
  ]);
  const questionSet = InterviewQuestionSetSchema.safeParse({ questions: session?.questions });
  if (!session || !questionSet.success) notFound();

  const job = JobAnalysisSchema.safeParse(session.job_analysis);
  const topics = job.data?.requirements.map((r) => r.label) ?? [];
  const questions = questionSet.data.questions.map((q) => q.grounded ? q : groundInterviewQuestion(q, "", topics));
  const attempts = answers.flatMap((answer) => {
    const feedback = AnswerFeedbackSchema.safeParse(answer.feedback);
    return feedback.success
      ? [{ id: answer.id, questionId: answer.question_id, answer: answer.answer, feedback: feedback.data.grounded
          ? feedback.data
          : scoreAnswer(answer.answer, groundAnswerRating(answer.answer, feedback.data.rating)) }]
      : [];
  });
  const hasKey = profile?.gemini_key_status === "valid";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/interview" className="inline-flex items-center gap-1.5 text-small text-ink-3 hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> Interview prep
        </Link>
        <h1 className="mt-2 text-page font-semibold tracking-[-0.015em]">{session.target_label}</h1>
        <p className="mt-1.5 text-body text-ink-2">Session started {formatRelativeTime(session.created_at)}.</p>
      </div>
      {!hasKey && <KeyMissing what="rate new practice answers" />}
      <InterviewPractice sessionId={session.id} questions={questions} attempts={attempts} hasKey={hasKey} />
    </div>
  );
}
