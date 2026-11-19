import { NextResponse } from "next/server";
import { z } from "zod";
import { scanCoverLetter } from "@/lib/career/coverLetter";
import { createCoverLetterScan } from "@/lib/data/cover-letter-scans";
import { JobTargetSchema, MAX_LETTER_LENGTH } from "@/lib/schemas/career";
import { careerRequest } from "@/lib/server/careerRequest";
import { resolveTarget } from "@/lib/server/careerTarget";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  letter: z.string().trim().min(40, "Paste your cover letter.").max(MAX_LETTER_LENGTH, "That letter is too long to scan."),
  target: JobTargetSchema,
});

/** Scans a cover letter against a job and saves the report. Deterministic once the job is known. */
export async function POST(request: Request) {
  const req = await careerRequest(request, Body);
  if (!req.ok) return req.response;
  const { userId, body } = req.value;

  const target = await resolveTarget(userId, body.target, "cover-letter-scan");
  if (!target.ok) return target.response;

  const report = scanCoverLetter(body.letter, target.value.job);
  const id = await createCoverLetterScan(userId, {
    target_label: target.value.label,
    resume_id: target.value.resumeId,
    job_description_id: target.value.jobDescriptionId,
    letter: body.letter,
    report,
    score: report.score.total,
  });
  return NextResponse.json({ id });
}
