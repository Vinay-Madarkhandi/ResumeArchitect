import { limitAi } from "@/lib/server/rateLimit";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";
import { importJobFromUrl, JobImportError } from "@/lib/server/jobImport";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Fetches a job post from a public URL for the New application form. Signed-in users only. */
export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const limited = await limitAi(user.id, "job-import");
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (typeof body?.url !== "string" || body.url.length > 2048) {
    return NextResponse.json({ error: "Paste a link to the job post." }, { status: 400 });
  }
  try {
    return NextResponse.json(await importJobFromUrl(body.url));
  } catch (error) {
    const message = error instanceof JobImportError ? error.message : "Couldn't import that page. Paste the job post instead.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
