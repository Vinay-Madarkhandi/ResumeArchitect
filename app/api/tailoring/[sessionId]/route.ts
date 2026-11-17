import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** Status of one run, for reconnecting to a run whose stream was interrupted. */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: session } = await supabase
    .from("tailoring_sessions")
    .select("status, stage, error_code, error_message, result_resume_id, score_before, score_after")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  return NextResponse.json({
    status: session.status,
    stage: session.stage,
    errorCode: session.error_code,
    errorMessage: session.error_message,
    resumeId: session.result_resume_id,
    scoreBefore: session.score_before,
    scoreAfter: session.score_after,
  });
}
