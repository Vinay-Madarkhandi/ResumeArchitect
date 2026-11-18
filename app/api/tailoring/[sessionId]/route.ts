import { getTailoringSession } from "@/lib/data/tailoring";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";

/** Status of one run, for reconnecting to a run whose stream was interrupted. */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const session = await getTailoringSession(user.id, sessionId);
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
