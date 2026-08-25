import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decryptApiKey } from "@/lib/crypto/keyCipher";
import { pgByteaToBuffer } from "@/lib/crypto/bytea";
import { analyzeMatch } from "@/lib/gemini/prompts/analyzeMatch";
import { documentToMarkdown } from "@/lib/documentMarkdown";
import { DocumentContentSchema } from "@/lib/schemas/document";
import type { MatchAnalysis } from "@/lib/schemas/matchAnalysis";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * On-demand job-match analysis — not live/debounced like page-count, since
 * this is a real Gemini call against the user's own key rather than a free
 * local computation; triggered explicitly ("Check job match" in the
 * editor), not on every keystroke. Only available for a resume that was
 * actually tailored to a job (job_description_id set) — there's nothing to
 * measure compatibility against otherwise. Analyzes the *live* (possibly
 * unsaved) editor content posted by the client.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, job_description_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  if (!resume.job_description_id) {
    return NextResponse.json(
      { error: "This resume isn't tailored to a specific job, so there's nothing to measure it against." },
      { status: 400 },
    );
  }

  const { data: jobDescription } = await supabase
    .from("job_descriptions")
    .select("raw_text")
    .eq("id", resume.job_description_id)
    .eq("user_id", user.id)
    .single();
  if (!jobDescription) return NextResponse.json({ error: "The original job description couldn't be found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = DocumentContentSchema.safeParse(body?.content);
  if (!parsed.success) return NextResponse.json({ error: "Invalid content." }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_key_ciphertext, gemini_key_status")
    .eq("id", user.id)
    .single();

  if (!profile?.gemini_key_ciphertext || profile.gemini_key_status === "not_configured") {
    return NextResponse.json({ error: "Connect your Gemini API key in Settings first." }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(pgByteaToBuffer(profile.gemini_key_ciphertext));
  } catch {
    return NextResponse.json({ error: "Your saved key couldn't be read. Please re-enter it in Settings." }, { status: 400 });
  }

  const resumeMarkdown = documentToMarkdown(parsed.data);
  const result = await analyzeMatch(apiKey, resumeMarkdown, jobDescription.raw_text);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 422 });
  }

  // matchedSkills is a set difference, computed here rather than trusting
  // two independently-generated lists to already partition cleanly — see
  // lib/schemas/matchAnalysis.ts's doc comment.
  const required = result.result.requiredSkills;
  const missingLower = new Set(result.result.missingSkills.map((s) => s.trim().toLowerCase()));
  const missingSkills = required.filter((s) => missingLower.has(s.trim().toLowerCase()));
  const matchedSkills = required.filter((s) => !missingLower.has(s.trim().toLowerCase()));
  const matchScore = required.length > 0 ? Math.round((matchedSkills.length / required.length) * 100) : null;

  const analysis: MatchAnalysis = {
    matchScore,
    requiredSkills: required,
    matchedSkills,
    missingSkills,
    summary: result.result.summary,
  };
  return NextResponse.json(analysis);
}
