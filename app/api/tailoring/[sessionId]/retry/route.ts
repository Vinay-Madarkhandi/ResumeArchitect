import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decryptApiKey } from "@/lib/crypto/keyCipher";
import { pgByteaToBuffer } from "@/lib/crypto/bytea";
import { runTailoringSession } from "@/lib/tailoring/runTailoringSession";
import { ResumeContentSchema } from "@/lib/schemas/resume";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "unauthorized" }, { status: 401 });

  const { data: previousSession } = await supabase
    .from("tailoring_sessions")
    .select("id, user_id, source_resume_id, job_description_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!previousSession || !previousSession.source_resume_id || !previousSession.job_description_id) {
    return NextResponse.json({ errorCode: "unknown", errorMessage: "That session can't be retried." }, { status: 404 });
  }

  const { data: sourceResume } = await supabase
    .from("resumes")
    .select("id, title, content")
    .eq("id", previousSession.source_resume_id)
    .eq("user_id", user.id)
    .single();

  if (!sourceResume) {
    return NextResponse.json(
      { errorCode: "source_not_found", errorMessage: "The original resume for this session is no longer available." },
      { status: 404 },
    );
  }

  const sourceContent = ResumeContentSchema.safeParse(sourceResume.content);
  if (!sourceContent.success) {
    return NextResponse.json({ errorCode: "source_not_found", errorMessage: "That resume's content looks corrupted." }, { status: 422 });
  }

  const { data: jobDescription } = await supabase
    .from("job_descriptions")
    .select("job_title, company, raw_text")
    .eq("id", previousSession.job_description_id)
    .eq("user_id", user.id)
    .single();

  if (!jobDescription) {
    return NextResponse.json({ errorCode: "unknown", errorMessage: "The job description for this session is no longer available." }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_key_ciphertext, gemini_key_status")
    .eq("id", user.id)
    .single();

  if (!profile?.gemini_key_ciphertext || profile.gemini_key_status === "not_configured") {
    return NextResponse.json(
      { errorCode: "missing_api_key", errorMessage: "Connect your Gemini API key in Settings before tailoring." },
      { status: 400 },
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(pgByteaToBuffer(profile.gemini_key_ciphertext));
  } catch {
    return NextResponse.json(
      { errorCode: "invalid_api_key", errorMessage: "Your saved key couldn't be read. Please re-enter it in Settings." },
      { status: 400 },
    );
  }

  const result = await runTailoringSession({
    supabase,
    userId: user.id,
    apiKey,
    sourceResume: { id: sourceResume.id, title: sourceResume.title, content: sourceContent.data },
    jobDescriptionId: previousSession.job_description_id,
    jobDescriptionText: jobDescription.raw_text,
    jobTitle: jobDescription.job_title,
    company: jobDescription.company,
  });

  if (!result.ok) {
    return NextResponse.json(
      { sessionId: result.sessionId, errorCode: result.errorCode, errorMessage: result.errorMessage },
      { status: 422 },
    );
  }

  return NextResponse.json({ sessionId: result.sessionId, resumeId: result.resumeId, changes: result.changes });
}
