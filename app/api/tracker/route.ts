import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { checkOrigin } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/cache/rateLimit";
import { addJobs, archiveJob, deleteJob, editJob, listJobs, moveJob } from "@/lib/data/jobs";
import { exportJobsCsv, importJobsCsv, maxCsvBytes } from "@/lib/tracker/csv";
import { jobSchema } from "@/lib/tracker/schema";
import { stages } from "@/lib/tracker/stages";
import { BodyTooLarge, readText } from "@/lib/server/request-body";

const mutation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), job: jobSchema }),
  z.object({ action: z.literal("edit"), id: z.uuid(), job: jobSchema.omit({ stage: true }) }),
  z.object({ action: z.literal("move"), id: z.uuid(), stage: z.enum(stages) }),
  z.object({ action: z.literal("archive"), id: z.uuid(), archived: z.boolean() }),
  z.object({ action: z.literal("delete"), id: z.uuid() }),
]);

const IMPORTS_PER_HOUR = 10;

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Sign in to export your jobs.", 401);
  return new Response(exportJobsCsv(await listJobs(user.id)), { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="resume-architect-jobs.csv"',
    "Cache-Control": "no-store",
  } });
}

export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const user = await currentUser();
  if (!user) return fail("Sign in to edit your jobs.", 401);

  const csv = request.headers.get("content-type")?.split(";")[0] === "text/csv";
  if (csv) {
    const retrySeconds = await rateLimit("tracker-import", user.id, IMPORTS_PER_HOUR, 3_600_000);
    if (retrySeconds) {
      return Response.json({ error: "Too many imports. Try again later." }, { status: 429, headers: { "Retry-After": String(retrySeconds) } });
    }
  }
  let text: string;
  try {
    text = await readText(request, csv ? maxCsvBytes : 512_000);
  } catch (error) {
    if (error instanceof BodyTooLarge) return fail("The upload is too large.", 413);
    return fail("Couldn't read the upload.", 400);
  }

  if (csv) {
    let jobs;
    try {
      jobs = importJobsCsv(text);
    } catch (error) {
      return fail((error as Error).message, 400);
    }
    const imported = await addJobs(user.id, jobs);
    return Response.json({ count: imported.length }, { status: 201 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("Invalid job update.", 400);
  }
  const parsed = mutation.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(`Check ${issue.path.join(".") || "the job details"}. ${issue.message}`, 400);
  }
  const input = parsed.data;
  if (input.action === "create") {
    const [job] = await addJobs(user.id, [input.job]);
    return Response.json(job, { status: 201 });
  }
  const job = input.action === "move" ? await moveJob(user.id, input.id, input.stage)
    : input.action === "archive" ? await archiveJob(user.id, input.id, input.archived)
    : input.action === "delete" ? await deleteJob(user.id, input.id)
    : await editJob(user.id, input.id, input.job);
  return job ? Response.json(job) : fail("Job not found.", 404);
}
