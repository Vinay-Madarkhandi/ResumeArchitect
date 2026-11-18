import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { createJobDescription, findJobDescriptionByText, getJobDescription } from "@/lib/data/job-descriptions";
import { getResume } from "@/lib/data/resumes";
import { resolveDocument } from "@/lib/documentConversion";
import { MAX_JOB_DESCRIPTION_LENGTH, MIN_JOB_DESCRIPTION_LENGTH } from "@/lib/schemas/tailoring";
import { ImportError, importResume, MAX_RESUME_CHARS, MAX_UPLOAD_FORM_BYTES, readResumeUpload } from "@/lib/server/importResume";
import { BodyTooLarge, readFormData } from "@/lib/server/request-body";
import { limitScans, scanResume, type ScannedResume, type ScanResult } from "@/lib/server/scan";
import { postingUrlSchema } from "@/lib/tracker/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Pasted text bound for Postgres, which rejects U+0000. */
const pasted = (schema: z.ZodString) => z.preprocess((v) => (typeof v === "string" ? v.replaceAll("\0", "") : v), schema);

const ScanForm = z.object({
  resume: z.discriminatedUnion("source", [
    z.object({ source: z.literal("saved"), resumeId: z.uuid("Choose a resume.") }),
    z.object({ source: z.literal("upload"), file: z.instanceof(File, { message: "Choose a PDF or Word file." }) }),
    z.object({
      source: z.literal("paste"),
      text: pasted(z.string().trim().min(80, "Paste your whole resume.").max(MAX_RESUME_CHARS, "That's longer than a resume.")),
    }),
  ]),
  job: z.discriminatedUnion("source", [
    z.object({ source: z.literal("saved"), jobId: z.uuid("Choose a job.") }),
    z.object({
      source: z.literal("paste"),
      text: pasted(z.string().trim()
        .min(MIN_JOB_DESCRIPTION_LENGTH, "That job description looks too short. Paste the full posting.")
        .max(MAX_JOB_DESCRIPTION_LENGTH, "That job description is very long. Paste just the role details and requirements.")),
      url: postingUrlSchema.default(""),
      title: pasted(z.string().trim().max(250)).default(""),
      company: pasted(z.string().trim().max(250)).default(""),
    }),
  ]),
});
type ScanInput = z.infer<typeof ScanForm>;

function fromForm(form: FormData) {
  const field = (name: string) => form.get(name) ?? undefined;
  return {
    resume: { source: field("resumeSource"), resumeId: field("resumeId"), file: field("file"), text: field("resumeText") },
    job: { source: field("jobSource"), jobId: field("jobId"), text: field("jobText"), url: field("jobUrl"), title: field("jobTitle"), company: field("company") },
  };
}

const error = (status: number, message: string, code?: string) => NextResponse.json({ error: message, code }, { status });
const failed = <T,>(r: ScanResult<T>): r is Extract<ScanResult<T>, { ok: false }> => !r.ok;

async function readResume(userId: string, input: ScanInput["resume"]): Promise<ScanResult<ScannedResume>> {
  if (input.source === "saved") {
    const resume = await getResume(userId, input.resumeId);
    const content = resume && resolveDocument(resume.content);
    if (!resume || !content) return { ok: false, status: 404, code: "not_found", error: "That resume wasn't found." };
    return { ok: true, value: { id: resume.id, label: resume.title, content, file: null } };
  }
  if (input.source === "paste") {
    const { content } = await importResume(userId, { source: "text", text: input.text, parsed: null }, null);
    return { ok: true, value: { id: null, label: "Pasted resume", content, file: null } };
  }
  const { facts, resume } = await readResumeUpload(input.file);
  const { content } = await importResume(userId, resume, null);
  return { ok: true, value: { id: null, label: input.file.name.slice(0, 250), content, file: facts } };
}

async function readJob(userId: string, input: ScanInput["job"]) {
  if (input.source === "saved") return getJobDescription(userId, input.jobId);
  const existing = await findJobDescriptionByText(userId, input.text);
  if (existing) return existing;
  const id = await createJobDescription(userId, {
    raw_text: input.text, job_title: input.title || null, company: input.company || null, source_url: input.url || null,
  });
  return getJobDescription(userId, id);
}

/**
 * Scans a resume (saved, uploaded, or pasted) against a job (tracked or
 * pasted) and saves the Match Report. Multipart form fields: resumeSource,
 * resumeId | file | resumeText, jobSource, jobId | jobText, and optional
 * jobUrl, jobTitle, company.
 */
export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return error(401, "Sign in to continue.");

  let form: FormData | null;
  try {
    form = await readFormData(request, MAX_UPLOAD_FORM_BYTES);
  } catch (e) {
    if (e instanceof BodyTooLarge) return error(413, "That file is over 8 MB. Upload a smaller one.", "invalid_input");
    throw e;
  }
  const parsed = ScanForm.safeParse(form ? fromForm(form) : null);
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Choose a resume and a job.");

  const slow = await limitScans(user.id);
  if (slow) return error(slow.status, slow.error, slow.code);

  let resume: ScanResult<ScannedResume>;
  try {
    resume = await readResume(user.id, parsed.data.resume);
  } catch (e) {
    return error(422, e instanceof ImportError ? e.message : "That resume couldn't be read. Paste the text instead.");
  }
  if (failed(resume)) return error(resume.status, resume.error, resume.code);

  const job = await readJob(user.id, parsed.data.job);
  if (!job) return error(404, "That job wasn't found.", "not_found");
  if (job.raw_text.trim().length < MIN_JOB_DESCRIPTION_LENGTH) {
    return error(400, "That job has no description to scan against. Add the posting text in the tracker first.", "invalid_input");
  }

  const scan = await scanResume(user.id, resume.value, job);
  if (failed(scan)) return error(scan.status, scan.error, scan.code);
  return NextResponse.json({ id: scan.value }, { status: 201 });
}
