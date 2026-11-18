import { rateLimit } from "@/lib/cache/rateLimit";

export const RUNS_PER_HOUR = 20;

export async function tailoringRateLimit(userId: string): Promise<number | null> {
  const retrySeconds = await rateLimit("tailoring", userId, RUNS_PER_HOUR, 3_600_000);
  return retrySeconds ? Math.ceil(retrySeconds / 60) : null;
}

export async function limitAi(userId: string, kind: string, limit = 30) {
  const retrySeconds = await rateLimit(`ai-${kind}`, userId, limit, 3_600_000);
  if (retrySeconds) {
    return Response.json({ error: "Too many requests. Try again later." }, {
      status: 429, headers: { "Retry-After": String(retrySeconds) },
    });
  }
}
