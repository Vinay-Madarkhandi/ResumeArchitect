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
  const { id } = await params;
  const owned = await requireOwnedResume(id);
  if (!owned.ok) return owned.response;
  const { supabase, user } = owned;

  const body = await request.json().catch(() => null);
  const content = DocumentContentSchema.safeParse(body?.content);
  if (!content.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const tone: CoverLetterTone = COVER_LETTER_TONES.includes(body?.tone) ? body.tone : "confident";

  const { data: resume } = await supabase
    .from("resumes")
    .select("tailoring_session_id, job_description_id")
    .eq("id", id)
    .single();
  if (!resume?.tailoring_session_id) {
    return NextResponse.json({ error: "Cover letters are written for a tailored application." }, { status: 400 });
  }
  const [{ data: session }, { data: jd }] = await Promise.all([
    supabase.from("tailoring_sessions").select("job_analysis").eq("id", resume.tailoring_session_id).single(),
    resume.job_description_id
      ? supabase.from("job_descriptions").select("raw_text").eq("id", resume.job_description_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const job = JobAnalysisSchema.safeParse(session?.job_analysis);
  if (!job.success) return NextResponse.json({ error: "This application has no job analysis." }, { status: 400 });

  const key = await loadGeminiKey(supabase, user.id);
  if (!key.ok) return NextResponse.json({ error: key.message }, { status: 400 });

  try {
    const letter = await writeCoverLetter(geminiModel(key.apiKey), {
      resumeMarkdown: documentToMarkdown(content.data),
      job: job.data,
      jobText: jd?.raw_text ?? null,
      tone,
    });
    await supabase.from("resumes").update({ cover_letter: letter }).eq("id", id);
    return NextResponse.json({ letter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AiError ? error.message : "Couldn't write the letter. Try again." },
      { status: 422 },
    );
  }
}
