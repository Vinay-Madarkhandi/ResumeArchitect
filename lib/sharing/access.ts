import { createHmac, timingSafeEqual } from "node:crypto";
import { isToken, newToken } from "@/lib/auth/secrets";

export const newShareSlug = newToken;
export const isShareSlug = isToken;

export const shareCookieName = (slug: string) => `ra_share_${slug}`;

export function shareGrant(slug: string, passwordHash: string) {
  return createHmac("sha256", passwordHash).update(`resume-share:${slug}`).digest("base64url");
}

export function validShareGrant(value: string | undefined, slug: string, passwordHash: string) {
  if (!value || !isToken(value)) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(shareGrant(slug, passwordHash)));
}
