import { clipJob } from "@/lib/data/jobs";
import { clipperPreflight, withClipperToken } from "@/lib/server/clipper-api";
import { BodyTooLarge, readText } from "@/lib/server/request-body";
import { jobClipSchema } from "@/lib/tracker/schema";

export function OPTIONS(request: Request) {
  return clipperPreflight(request, "POST");
}

export function POST(request: Request) {
  return withClipperToken(request, async (user, headers) => {
    let body: unknown;
    try {
      body = JSON.parse(await readText(request, 320_000));
    } catch (error) {
      if (error instanceof BodyTooLarge) return Response.json({ error: "Job payload is too large." }, { status: 413, headers });
      return Response.json({ error: "Send a JSON job payload." }, { status: 400, headers });
    }
    const parsed = jobClipSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json({ error: `Check the ${issue.path.join(".") || "job payload"}. ${issue.message}` }, { status: 400, headers });
    }
    const job = await clipJob(user.id, parsed.data);
    return Response.json({ id: job.id, path: `/tracker?job=${job.id}` }, { status: 201, headers });
  });
}
