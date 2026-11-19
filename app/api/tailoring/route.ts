import { readJson } from "@/lib/server/request-body";
import { postingUrlSchema } from "@/lib/tracker/schema";
import { getTrackedJob } from "@/lib/data/jobs";
import { getResume } from "@/lib/data/resumes";
import { getTailoringSession } from "@/lib/data/tailoring";
import { createJobDescription, getJobDescription, saveJobFacts } from "@/lib/data/job-descriptions";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { after, NextResponse } from "next/server";
import { resolveDocument } from "@/lib/documentConversion";
import { geminiModel } from "@/lib/gemini/model";
import { loadGeminiKey } from "@/lib/server/geminiKey";
import { RUNS_PER_HOUR, tailoringRateLimit } from "@/lib/server/rateLimit";
import {
  MAX_JOB_DESCRIPTION_LENGTH,
  MIN_JOB_DESCRIPTION_LENGTH,
  type PipelineEvent,
} from "@/lib/schemas/tailoring";
import { JobFactsSchema } from "@/lib/schemas/jobFacts";
import { runPipeline } from "@/lib/tailoring/pipeline";
import { postgresPipelineStore } from "@/lib/tailoring/postgresStore";

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
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return fail(401, "unauthorized", "Sign in to continue.");

  const json = await readJson<Record<string, unknown>>(request);
  if (!json.ok) return json.response;
  const body = json.data;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  let sourceResumeId = str(body?.sourceResumeId);
  let jobDescriptionText = str(body?.jobDescriptionText);
  let jobDescriptionId: string | null = null;
  let jobTitle = str(body?.jobTitle) || null;
  let company = str(body?.company) || null;

  const sourceUrl = postingUrlSchema.safeParse(str(body?.sourceUrl));
  const trackedJobId = str(body?.trackedJobId);
  const savedJobId = str(body?.jobDescriptionId);
  const retrySessionId = str(body?.retrySessionId);
  if (retrySessionId) {
    const previous = await getTailoringSession(user.id, retrySessionId);
    if (!previous?.source_resume_id || !previous.job_description_id) {
      return fail(404, "source_not_found", "That run can't be retried. Start a new application instead.");
    }
    const jd = await getJobDescription(user.id, previous.job_description_id);
    if (!jd) return fail(404, "invalid_jd", "The job description for that run is gone. Start a new application.");
    sourceResumeId = previous.source_resume_id;
    jobDescriptionText = jd.raw_text;
    jobDescriptionId = jd.id;
    jobTitle = jd.job_title;
    company = jd.company;
  } else if (savedJobId) {
    const job = await getJobDescription(user.id, savedJobId);
    if (!job) return fail(404, "invalid_jd", "That job could not be found.");
    jobDescriptionId = job.id;
    jobDescriptionText = job.raw_text.trim();
    jobTitle = job.job_title;
    company = job.company;
  } else if (trackedJobId) {
    const job = await getTrackedJob(user.id, trackedJobId);
    if (!job) return fail(404, "invalid_jd", "That tracked job could not be found.");
    jobDescriptionId = job.id;
    jobDescriptionText = job.description.trim();
    jobTitle = job.title;
    company = job.company || null;
  }

  if (!sourceResumeId) return fail(400, "source_not_found", "Choose a resume to tailor.");
  if (jobDescriptionText.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return fail(400, "invalid_jd", "That job description looks too short. Paste the full posting.");
  }
  if (jobDescriptionText.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return fail(400, "invalid_jd", "That job description is very long. Paste just the role details and requirements.");
  }

  const source = await getResume(user.id, sourceResumeId);
  if (!source) return fail(404, "source_not_found", "That resume could not be found.");
  const sourceDoc = resolveDocument(source.content);
  if (!sourceDoc) return fail(422, "source_not_found", "That resume couldn't be read. Open it and save it once, then retry.");

  const key = await loadGeminiKey(user.id);
  if (!key.ok) return fail(400, key.code, key.message);

  const waitMinutes = await tailoringRateLimit(user.id);
  if (waitMinutes !== null) {
    return fail(
      429,
      "rate_limited",
      `You've started ${RUNS_PER_HOUR} runs in the last hour. Try again in about ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.`,
    );
  }

  if (!jobDescriptionId) {
    const jdId = await createJobDescription(user.id, {
      raw_text: jobDescriptionText, company, job_title: jobTitle,
      source_url: sourceUrl.data || null,
    })
      .catch(() => null);
    if (!jdId) return fail(500, "unknown", "Couldn't save the job description. Try again.");
    jobDescriptionId = jdId;
  }

  const posting = await getJobDescription(user.id, jobDescriptionId);
  if (!posting) return fail(404, "invalid_jd", "That job could not be found.");
  const jobFacts = JobFactsSchema.safeParse(posting.job_facts);
  const events = runPipeline(
    {
      model: geminiModel(key.apiKey, user.id),
      saveFacts: (facts) => saveJobFacts(user.id, posting.id, facts, posting.raw_text),
      store: postgresPipelineStore(user.id, {
        sourceResumeId: source.id,
        sourceTitle: source.title,
        designSourcePath: source.design_source_path,
        jobDescriptionId,
      }),
    },
    { source: { title: source.title, content: sourceDoc }, jobDescription: posting.raw_text, jobFacts: jobFacts.data, jobTitle, company },
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
