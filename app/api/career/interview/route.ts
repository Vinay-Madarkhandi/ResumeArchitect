import { NextResponse } from "next/server";
import { z } from "zod";
import { createInterviewSession } from "@/lib/data/interview";
import { writeInterviewQuestions } from "@/lib/gemini/prompts/interviewQuestions";
import { InterviewTargetSchema } from "@/lib/schemas/career";
import { careerRequest } from "@/lib/server/careerRequest";
import { aiFailure, aiModel, groundingResume, resolveTarget } from "@/lib/server/careerTarget";

export const runtime = "nodejs";
export const maxDuration = 90;

const Body = z.object({ target: InterviewTargetSchema });

/** Generates interview questions for a job from the user's resume and saves the session. */
export async function POST(request: Request) {
  const req = await careerRequest(request, Body);
  if (!req.ok) return req.response;
  const { userId, body } = req.value;

  // Fail on a missing key before anything is saved.
  const model = await aiModel(userId, "interview");
  if (!model.ok) return model.response;
  const target = await resolveTarget(userId, body.target, "interview", model.value);
  if (!target.ok) return target.response;
  const resume = await groundingResume(userId, target.value.resumeId);
  if (!resume.ok) return resume.response;

  try {
    const questions = await writeInterviewQuestions(model.value, {
      job: target.value.job,
      jobText: target.value.jobText,
      resumeMarkdown: resume.value.markdown,
    });
    const id = await createInterviewSession(userId, {
      target_label: target.value.label,
      job_analysis: target.value.job,
      resume_id: resume.value.id,
      job_description_id: target.value.jobDescriptionId,
      questions,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return aiFailure(error, "Couldn't write questions. Try again.");
  }
}
