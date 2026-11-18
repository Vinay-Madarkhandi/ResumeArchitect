import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

const globals = globalThis as typeof globalThis & { resumeSql?: ReturnType<typeof postgres> };
export const sqlClient = globals.resumeSql ?? postgres(process.env.DATABASE_URL ?? "postgres://resume:resume@localhost:55432/resume", {
  max: 10, idle_timeout: 30, connect_timeout: 5,
  onnotice: ({ code, severity }) => logger.debug({ code, severity }, "Postgres notice"),
});
if (process.env.NODE_ENV !== "production") globals.resumeSql = sqlClient;

export const db = drizzle(sqlClient, { schema });
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
