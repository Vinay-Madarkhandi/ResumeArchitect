import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
import { geminiModel } from "@/lib/gemini/model";
import { loadGeminiKey } from "@/lib/server/geminiKey";
import {
  MAX_JOB_DESCRIPTION_LENGTH,
  MIN_JOB_DESCRIPTION_LENGTH,
  type PipelineEvent,
} from "@/lib/schemas/tailoring";
import { runPipeline } from "@/lib/tailoring/pipeline";
import { supabasePipelineStore } from "@/lib/tailoring/supabaseStore";

export const runtime = "nodejs";
export const maxDuration = 300;

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ errorCode: code, errorMessage: message }, { status });
}

/**
 * Starts a tailoring run and streams its progress as newline-delimited JSON
 * (one PipelineEvent per line). Body is either a new application
 *   { sourceResumeId, jobDescriptionText, jobTitle?, company? }
 * or a retry of an earlier session that reuses its resume and job text
 *   { retrySessionId }.
 */
export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthorized", "Sign in to continue.");

  const body = await request.json().catch(() => null);
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  let sourceResumeId = str(body?.sourceResumeId);
  let jobDescriptionText = str(body?.jobDescriptionText);
  let jobDescriptionId: string | null = null;
  const jobTitle = str(body?.jobTitle) || null;
  const company = str(body?.company) || null;

  const retrySessionId = str(body?.retrySessionId);
  if (retrySessionId) {
    const { data: previous } = await supabase
      .from("tailoring_sessions")
      .select("source_resume_id, job_description_id")
      .eq("id", retrySessionId)
      .eq("user_id", user.id)
      .single();
    if (!previous?.source_resume_id || !previous.job_description_id) {
      return fail(404, "source_not_found", "That run can't be retried. Start a new application instead.");
    }
    const { data: jd } = await supabase
      .from("job_descriptions")
      .select("id, raw_text")
      .eq("id", previous.job_description_id)
      .single();
    if (!jd) return fail(404, "invalid_jd", "The job description for that run is gone. Start a new application.");
    sourceResumeId = previous.source_resume_id;
    jobDescriptionText = jd.raw_text;
    jobDescriptionId = jd.id;
  }

  if (!sourceResumeId) return fail(400, "source_not_found", "Choose a resume to tailor.");
  if (jobDescriptionText.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return fail(400, "invalid_jd", "That job description looks too short. Paste the full posting.");
  }
  if (jobDescriptionText.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return fail(400, "invalid_jd", "That job description is very long. Paste just the role details and requirements.");
  }

  const { data: source } = await supabase
    .from("resumes")
    .select("id, title, content")
    .eq("id", sourceResumeId)
    .eq("user_id", user.id)
    .single();
  if (!source) return fail(404, "source_not_found", "That resume could not be found.");
  const sourceDoc = resolveDocument(source.content);
  if (!sourceDoc) return fail(422, "source_not_found", "That resume couldn't be read. Open it and save it once, then retry.");

  const key = await loadGeminiKey(supabase, user.id);
  if (!key.ok) return fail(400, key.code, key.message);

  if (!jobDescriptionId) {
    const { data: jd, error } = await supabase
      .from("job_descriptions")
      .insert({ user_id: user.id, raw_text: jobDescriptionText, company, job_title: jobTitle })
      .select("id")
      .single();
    if (error || !jd) return fail(500, "unknown", "Couldn't save the job description. Try again.");
    jobDescriptionId = jd.id;
  }

  const events = runPipeline(
    {
      model: geminiModel(key.apiKey),
      store: supabasePipelineStore(supabase, {
        userId: user.id,
        sourceResumeId: source.id,
        sourceTitle: source.title,
        jobDescriptionId,
      }),
    },
    { source: { title: source.title, content: sourceDoc }, jobDescription: jobDescriptionText, jobTitle, company },
  );

  // The run is independent of the connection: if the browser goes away, sends
  // become no-ops and the pipeline still finishes (or records its failure).
  // after() keeps the function alive until then, and the client can pick the
  // result up from GET /api/tailoring/[sessionId].
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      open = false;
    },
  });
  const send = (e: PipelineEvent) => {
    if (!open) return;
    try {
      controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
    } catch {
      open = false;
    }
  };
  const run = (async () => {
    try {
      for await (const event of events) send(event);
    } catch {
      send({ type: "error", code: "unknown", message: "Something went wrong. Your resume wasn't changed; try again." });
    } finally {
      if (open) {
        open = false;
        try {
          controller.close();
        } catch {}
      }
    }
  })();
  after(() => run);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
