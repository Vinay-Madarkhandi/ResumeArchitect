import { createHmac, randomBytes } from "node:crypto";
import { cache } from "@/lib/cache";
import { rateLimit } from "@/lib/cache/rateLimit";

export const SHARE_VIEWS_PER_IP_PER_MINUTE = 24;
const DAY_MS = 86_400_000;

export interface ShareVisitor {
  ip: string | null;
  userAgent: string | null;
}

/** Reserve an increment across replicas. Redis stores only opaque digests,
 * expiring each visitor key and its random salt at the UTC day boundary.
 */
export async function claimShareView(slug: string, { ip, userAgent }: ShareVisitor, now = Date.now()) {
  const day = Math.floor(now / DAY_MS);
  const ttl = (day + 1) * DAY_MS - now;
  const redis = cache();
  const saltKey = `share-view-salt:${day}`;
  let salt = await redis.get(saltKey);
  if (!salt) {
    const candidate = randomBytes(32).toString("hex");
    salt = await redis.set(saltKey, candidate, "PX", ttl, "NX") === "OK" ? candidate : await redis.get(saltKey);
    if (!salt) return false;
  }
  const hash = (parts: unknown[]) => createHmac("sha256", salt).update(JSON.stringify(parts)).digest("hex");
  const visitorKey = `share-view:${day}:${hash([slug, ip, userAgent])}`;
  if (await redis.exists(visitorKey)) return false;
  if (await rateLimit("share-view-ip", hash([ip]), SHARE_VIEWS_PER_IP_PER_MINUTE, 60_000)) return false;
  if (await rateLimit("share-view-slug", slug, 120, 60_000)) return false;
  return await redis.set(visitorKey, "1", "PX", ttl, "NX") === "OK";
}
