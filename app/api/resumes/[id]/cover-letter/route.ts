import { limitAi } from "@/lib/server/rateLimit";
import { getJobDescription } from "@/lib/data/job-descriptions";
import { getTailoringSession } from "@/lib/data/tailoring";
import { updateResume } from "@/lib/data/resumes";
import { checkOrigin } from "@/lib/auth/guards";
import { NextResponse } from "next/server";
import { requireOwnedResume } from "@/lib/server/ownedResume";
import { loadGeminiKey } from "@/lib/server/geminiKey";
import { AiError, geminiModel } from "@/lib/gemini/model";
import { COVER_LETTER_TONES, writeCoverLetter, type CoverLetterTone } from "@/lib/gemini/prompts/coverLetter";
import { documentToMarkdown } from "@/lib/documentMarkdown";
import { DocumentContentSchema } from "@/lib/schemas/document";
import { JobAnalysisSchema } from "@/lib/schemas/jobAnalysis";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Writes a cover letter from the live resume and this application's job, and saves it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  const owned = await requireOwnedResume(id);
  if (!owned.ok) return owned.response;
  const { user, resume } = owned;

  const body = await request.json().catch(() => null);
  const content = DocumentContentSchema.safeParse(body?.content);
  if (!content.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const tone: CoverLetterTone = COVER_LETTER_TONES.includes(body?.tone) ? body.tone : "confident";

  if (!resume?.tailoring_session_id) {
    return NextResponse.json({ error: "Cover letters are written for a tailored application." }, { status: 400 });
  }
  const [session, jd] = await Promise.all([
    getTailoringSession(user.id, resume.tailoring_session_id),
    resume.job_description_id
      ? getJobDescription(user.id, resume.job_description_id)
      : Promise.resolve(null),
  ]);
  const job = JobAnalysisSchema.safeParse(session?.job_analysis);
  if (!job.success) return NextResponse.json({ error: "This application has no job analysis." }, { status: 400 });

  const limited = await limitAi(user.id, "cover-letter");
  if (limited) return limited;

  const key = await loadGeminiKey(user.id);
  if (!key.ok) return NextResponse.json({ error: key.message }, { status: 400 });

  try {
    const source = DocumentContentSchema.safeParse(session?.source_snapshot);
    if (!source.success) return NextResponse.json({ error: "This application has no original resume to verify the letter against." }, { status: 422 });
    const letter = await writeCoverLetter(geminiModel(key.apiKey, user.id), {
      resumeMarkdown: documentToMarkdown(content.data),
      sourceMarkdown: documentToMarkdown(source.data),
      job: job.data,
      jobText: jd?.raw_text ?? null,
      tone,
    });
    await updateResume(user.id, id, { cover_letter: letter });
    return NextResponse.json({ letter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AiError ? error.message : "Couldn't write the letter. Try again." },
      { status: 422 },
    );
  }
}
