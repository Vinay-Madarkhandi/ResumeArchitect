import { rateLimit } from "@/lib/cache/rateLimit";
import { createScan } from "@/lib/data/scans";
import { getJobDescription, saveJobFacts } from "@/lib/data/job-descriptions";
import { AiError, geminiModel } from "@/lib/gemini/model";
import { extractJobFacts } from "@/lib/gemini/prompts/extractJobFacts";
import { buildMatchReport } from "@/lib/report/matchReport";
import type { ResumeFileFacts } from "@/lib/report/report";
import { documentText } from "@/lib/resume/units";
import type { DocumentContent } from "@/lib/schemas/document";
import { JobFactsSchema, type JobFacts } from "@/lib/schemas/jobFacts";
import { loadGeminiKey } from "./geminiKey";
import { SCANS_PER_HOUR } from "./limits";

/**
 * The Resume Scanner: one resume measured against one job, saved as a scan.
 * The only AI call is reading the posting into `JobFacts`, done once per job
 * and cached on the job description; every scan after that is deterministic
 * and works without a Gemini key.
 */

export type ScanFailureCode = "missing_api_key" | "invalid_api_key" | "rate_limited" | "ai_failed" | "not_found" | "invalid_input";
export type ScanFailure = { ok: false; status: number; code: ScanFailureCode; error: string };
export type ScanResult<T> = { ok: true; value: T } | ScanFailure;

type JobRow = NonNullable<Awaited<ReturnType<typeof getJobDescription>>>;

export interface ScannedResume {
  /** Null for pasted text or an upload that isn't saved as a resume. */
  id: string | null;
  label: string;
  content: DocumentContent;
  file: ResumeFileFacts | null;
}

const JOB_READS_PER_HOUR = 30;

const failure = (status: number, code: ScanFailureCode, error: string): ScanFailure => ({ ok: false, status, code, error });

async function limited(userId: string, scope: string, limit: number): Promise<ScanFailure | null> {
  const retrySeconds = await rateLimit(scope, userId, limit, 3_600_000);
  if (!retrySeconds) return null;
  const minutes = Math.ceil(retrySeconds / 60);
  return failure(429, "rate_limited", `Too many scans for now. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`);
}

/** The job's facts: the cached copy, or read from the posting with the user's Gemini key and cached. */
export async function jobFactsFor(userId: string, job: JobRow): Promise<ScanResult<JobFacts>> {
  const cached = JobFactsSchema.safeParse(job.job_facts);
  if (cached.success) return { ok: true, value: cached.data };

  const key = await loadGeminiKey(userId);
  if (!key.ok) return failure(400, key.code, key.message);
  const slow = await limited(userId, "ai-job-facts", JOB_READS_PER_HOUR);
  if (slow) return slow;
  try {
    const facts = await extractJobFacts(geminiModel(key.apiKey, userId), job.raw_text);
    await saveJobFacts(userId, job.id, facts, job.raw_text);
    return { ok: true, value: facts };
  } catch (error) {
    if (error instanceof AiError) {
      const code = error.code === "invalid_api_key" ? "invalid_api_key" : error.code === "rate_limited" ? "rate_limited" : "ai_failed";
      return failure(422, code, error.message);
    }
    return failure(422, "ai_failed", "Couldn't read that job posting. Try again.");
  }
}

export async function ownedJobFacts(userId: string, jobId: string) {
  const job = await getJobDescription(userId, jobId);
  if (!job || !job.raw_text.trim()) return failure(404, "not_found", "That job wasn't found.");
  const facts = await jobFactsFor(userId, job);
  return facts.ok ? { ok: true as const, value: { job, facts: facts.value } } : facts;
}

/** Counts a scan against the hourly limit. Call it before reading any input, so a refused scan costs nothing. */
export const limitScans = (userId: string) => limited(userId, "scan", SCANS_PER_HOUR);

/** Scores the resume against the job and saves the scan. Returns the scan id. Callers apply `limitScans` first. */
export async function scanResume(userId: string, resume: ScannedResume, job: JobRow): Promise<ScanResult<string>> {
  const facts = await jobFactsFor(userId, job);
  if (!facts.ok) return facts;
  const report = buildMatchReport({ job: facts.value, jobText: job.raw_text, resume: resume.content, file: resume.file, asOf: new Date() });
  const id = await createScan(userId, {
    resumeId: resume.id,
    resumeLabel: resume.label,
    resumeText: documentText(resume.content),
    resumeContent: resume.content,
    jobDescriptionId: job.id,
    report,
  });
  return { ok: true, value: id };
}
