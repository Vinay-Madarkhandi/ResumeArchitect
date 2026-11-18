import { randomUUID, createHash } from "node:crypto";
import { cache } from "./index";

// Use Redis time and a single atomic operation across web replicas.
const script = `
local time = redis.call('TIME')
local now = time[1] * 1000 + math.floor(time[2] / 1000)
local window = tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return math.max(1, math.ceil((oldest[2] + window - now) / 1000))
end
if ARGV[3] ~= '' then
  redis.call('ZADD', KEYS[1], now, ARGV[3])
  redis.call('PEXPIRE', KEYS[1], window)
end
return 0
`;

async function run(scope: string, subject: string, limit: number, windowMs: number, member: string) {
  const key = createHash("sha256").update(subject).digest("hex");
  return Number(await cache().eval(script, 1, `rate:${scope}:${key}`, windowMs, limit, member));
}

/** Counts an attempt and returns the seconds to wait once the limit is reached, otherwise 0. */
export const rateLimit = (scope: string, subject: string, limit: number, windowMs: number) =>
  run(scope, subject, limit, windowMs, randomUUID());

/** Returns the seconds to wait without counting an attempt. */
export const rateLimitWait = (scope: string, subject: string, limit: number, windowMs: number) =>
  run(scope, subject, limit, windowMs, "");
