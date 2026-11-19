import { readJson } from "@/lib/server/request-body";
import { limitAi } from "@/lib/server/rateLimit";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";
import { detectAts } from "@/lib/ats";
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

  const json = await readJson<{ url?: unknown }>(request);
  if (!json.ok) return json.response;
  const body = json.data;
  if (typeof body?.url !== "string" || body.url.length > 2048) {
    return NextResponse.json({ error: "Paste a link to the job post." }, { status: 400 });
  }
  try {
    const job = await importJobFromUrl(body.url);
    return NextResponse.json({ ...job, ats: detectAts({ url: body.url, text: job.text }) });
  } catch (error) {
    const message = error instanceof JobImportError ? error.message : "Couldn't import that page. Paste the job post instead.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
