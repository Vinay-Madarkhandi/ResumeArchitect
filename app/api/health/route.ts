import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { checkStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const [postgres, redis, s3] = await Promise.allSettled([
    db.execute(sql`select 1`),
    cache().ping(),
    checkStorage(AbortSignal.timeout(3500)),
  ]);
  const services = { postgres: postgres.status === "fulfilled", redis: redis.status === "fulfilled", s3: s3.status === "fulfilled" };
  const ok = Object.values(services).every(Boolean);
  return Response.json({ ok, services }, { status: ok ? 200 : 503 });
}
