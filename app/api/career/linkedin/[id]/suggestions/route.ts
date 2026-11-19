import { NextResponse } from "next/server";
import { z } from "zod";
import { getLinkedInReview, saveLinkedInSuggestions } from "@/lib/data/linkedin-reviews";
import { suggestLinkedIn } from "@/lib/gemini/prompts/linkedinProfile";
import { LinkedInProfileSchema } from "@/lib/schemas/career";
import { JobAnalysisSchema } from "@/lib/schemas/jobAnalysis";
import { careerRequest } from "@/lib/server/careerRequest";
import { aiFailure, aiModel, groundingResume } from "@/lib/server/careerTarget";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Writes headline and About suggestions for a saved review, grounded in the user's resume. */
export async function POST(request: Request, { params }: RouteContext<"/api/career/linkedin/[id]/suggestions">) {
  const req = await careerRequest(request, z.unknown());
  if (!req.ok) return req.response;
  const { userId } = req.value;
  const { id } = await params;

  const review = await getLinkedInReview(userId, id);
  const profile = LinkedInProfileSchema.safeParse(review?.profile);
  if (!review || !profile.success) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  const job = review.job_analysis ? JobAnalysisSchema.safeParse(review.job_analysis) : null;

  const resume = await groundingResume(userId, review.resume_id);
  if (!resume.ok) return resume.response;
  const model = await aiModel(userId, "linkedin");
  if (!model.ok) return model.response;

  try {
    const suggestions = await suggestLinkedIn(model.value, {
      profile: profile.data,
      resumeMarkdown: resume.value.markdown,
      job: job?.success ? job.data : null,
    });
    await saveLinkedInSuggestions(userId, id, suggestions);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return aiFailure(error, "Couldn't write suggestions. Try again.");
  }
}
