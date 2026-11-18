import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { db, sqlClient } from "@/lib/db";
import { seedAdmins } from "@/lib/auth/accounts";
import { logger } from "@/lib/logger";

async function main() {
  const lock = postgres(process.env.DATABASE_URL ?? "postgres://resume:resume@localhost:55432/resume", { max: 1, connect_timeout: 5 });
  try {
    // Serialize deployment migrations without binding Drizzle to the lock connection.
    await lock.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(693470529)`;
      await migrate(db, { migrationsFolder: "drizzle" });
      await seedAdmins();
    });
    logger.info("Database migrations applied");
  } finally {
    await Promise.all([lock.end(), sqlClient.end()]);
  }
}

main().catch((error) => {
  logger.error({ code: error.cause?.code ?? error.code }, "Database migration failed");
  process.exitCode = 1;
});
