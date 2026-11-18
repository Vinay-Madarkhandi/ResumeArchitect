import Redis from "ioredis";
import { logger } from "@/lib/logger";

export const redisUrl = () => process.env.REDIS_URL ?? "redis://localhost:16379";
const globals = globalThis as typeof globalThis & { resumeRedis?: Redis };

export function cache() {
  if (!globals.resumeRedis) {
    globals.resumeRedis = new Redis(redisUrl(), {
      connectTimeout: 3000,
      commandTimeout: 3000,
      maxRetriesPerRequest: 1,
    });
    globals.resumeRedis.on("error", () => logger.warn("Redis connection error"));
  }
  return globals.resumeRedis;
}
