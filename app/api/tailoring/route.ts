import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decryptApiKey } from "@/lib/crypto/keyCipher";
import { pgByteaToBuffer } from "@/lib/crypto/bytea";
import { runTailoringSession } from "@/lib/tailoring/runTailoringSession";
import { ResumeContentSchema } from "@/lib/schemas/resume";
import { MIN_JOB_DESCRIPTION_LENGTH } from "@/lib/schemas/tailoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_JOB_DESCRIPTION_LENGTH = 20000;

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const sourceResumeId = typeof body?.sourceResumeId === "string" ? body.sourceResumeId : null;
  const jobDescriptionText = typeof body?.jobDescriptionText === "string" ? body.jobDescriptionText.trim() : "";
  const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.trim() || null : null;
  const company = typeof body?.company === "string" ? body.company.trim() || null : null;
  const location = typeof body?.location === "string" ? body.location.trim() || null : null;

  if (!sourceResumeId) {
    return NextResponse.json({ errorCode: "source_not_found", errorMessage: "Choose a resume to tailor." }, { status: 400 });
  }
  if (jobDescriptionText.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { errorCode: "invalid_jd", errorMessage: "Paste a bit more of the job description — that looked too short to tailor against." },
      { status: 400 },
    );
  }
  if (jobDescriptionText.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { errorCode: "invalid_jd", errorMessage: "That job description is too long. Please paste just the role details." },
      { status: 400 },
    );
  }

  const { data: sourceResume } = await supabase
    .from("resumes")
    .select("id, user_id, title, content")
    .eq("id", sourceResumeId)
    .eq("user_id", user.id)
    .single();

  if (!sourceResume) {
    return NextResponse.json({ errorCode: "source_not_found", errorMessage: "That resume could not be found." }, { status: 404 });
  }

  const sourceContent = ResumeContentSchema.safeParse(sourceResume.content);
  if (!sourceContent.success) {
    return NextResponse.json(
      { errorCode: "source_not_found", errorMessage: "That resume's content looks corrupted. Please open and re-save it first." },
      { status: 422 },
    );
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

  const { data: jobDescription, error: jdError } = await supabase
    .from("job_descriptions")
    .insert({ user_id: user.id, raw_text: jobDescriptionText, company, job_title: jobTitle, location })
    .select("id")
    .single();

  if (jdError || !jobDescription) {
    return NextResponse.json({ errorCode: "unknown", errorMessage: "Couldn't save the job description. Please try again." }, { status: 500 });
  }

  const result = await runTailoringSession({
    supabase,
    userId: user.id,
    apiKey,
    sourceResume: { id: sourceResume.id, title: sourceResume.title, content: sourceContent.data },
    jobDescriptionId: jobDescription.id,
    jobDescriptionText,
    jobTitle,
    company,
  });

  if (!result.ok) {
    return NextResponse.json(
      { sessionId: result.sessionId, errorCode: result.errorCode, errorMessage: result.errorMessage },
      { status: 422 },
    );
  }

  return NextResponse.json({ sessionId: result.sessionId, resumeId: result.resumeId, changes: result.changes });
}
