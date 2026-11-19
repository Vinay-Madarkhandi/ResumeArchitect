import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewLinkedIn } from "@/lib/career/linkedin";
import { createLinkedInReview } from "@/lib/data/linkedin-reviews";
import { LinkedInProfileSchema, TargetInputSchema } from "@/lib/schemas/career";
import { careerRequest } from "@/lib/server/careerRequest";
import { resolveTarget } from "@/lib/server/careerTarget";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ profile: LinkedInProfileSchema, target: TargetInputSchema });

/** Reviews pasted LinkedIn sections, against a target when one is given, and saves the report. */
export async function POST(request: Request) {
  const req = await careerRequest(request, Body);
  if (!req.ok) return req.response;
  const { userId, body } = req.value;

  const target = body.target.kind === "none" ? null : await resolveTarget(userId, body.target, "linkedin");
  if (target && !target.ok) return target.response;
  const resolved = target?.value ?? null;

  const report = reviewLinkedIn(body.profile, resolved?.job ?? null);
  const id = await createLinkedInReview(userId, {
    target_label: resolved?.label ?? null,
    job_analysis: resolved?.job ?? null,
    resume_id: resolved?.resumeId ?? null,
    job_description_id: resolved?.jobDescriptionId ?? null,
    profile: body.profile,
    report,
    score: report.score.total,
  });
  return NextResponse.json({ id });
}
