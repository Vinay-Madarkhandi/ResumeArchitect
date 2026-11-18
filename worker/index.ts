import { hostname } from "node:os";
import { Worker } from "bullmq";
import { cache, redisUrl } from "@/lib/cache";
import { sqlClient } from "@/lib/db";
import { deliverEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { maintenanceQueue, type EmailJob, type MaintenanceJob, type MaintenancePayload } from "@/lib/queue";
import { purgeExpiredAuth } from "@/lib/auth/purge";
import { deleteObjects, deleteUserObjects, listObjects, resumeBuckets } from "@/lib/storage";
import { referencedObjects } from "@/lib/data/resumes";

async function cleanOrphans() {
  const cutoff = Date.now() - 86_400_000;
  for (const bucket of resumeBuckets) {
    for await (const objects of listObjects(bucket)) {
      const byOwner = new Map<string, string[]>();
      for (const { Key, LastModified } of objects) {
        const owner = Key?.split("/")[0];
        if (!Key || !owner || !LastModified || LastModified.getTime() >= cutoff) continue;
        const paths = byOwner.get(owner) ?? [];
        paths.push(Key);
        byOwner.set(owner, paths);
      }
      for (const [owner, paths] of byOwner) {
        const referenced = await referencedObjects(owner, bucket, paths);
        await deleteObjects(owner, bucket, paths.filter((path) => !referenced.has(path)));
      }
    }
  }
}

async function main() {
  const queue = maintenanceQueue();
  await queue.upsertJobScheduler("purge-auth", { every: 3_600_000 }, { name: "purge-auth" });
  await queue.upsertJobScheduler("orphaned-objects", { every: 86_400_000 }, { name: "orphaned-objects" });

  const connection = { url: redisUrl(), maxRetriesPerRequest: null };
  const email = new Worker<EmailJob>("email", (job) => deliverEmail(job.data, job.id!), { connection, concurrency: 4 });
  const maintenance = new Worker<MaintenancePayload, void, MaintenanceJob>("maintenance", async (job) => {
    if (job.name === "delete-user-objects") {
      if (!job.data.userId) throw new Error("Account ID is required");
      return deleteUserObjects(job.data.userId);
    }
    if (job.name === "orphaned-objects") return cleanOrphans();
    if (job.name === "purge-auth") return purgeExpiredAuth();
  }, { connection });
  for (const worker of [email, maintenance]) {
    worker.on("failed", (job) => logger.error({ queue: worker.name, jobId: job?.id }, "Background job failed"));
    worker.on("error", () => logger.error({ queue: worker.name }, "Worker connection error"));
  }
  await Promise.all([email.waitUntilReady(), maintenance.waitUntilReady()]);
  const heartbeatKey = `worker:heartbeat:${hostname()}`;
  await cache().set(heartbeatKey, "1", "EX", 45);
  const heartbeat = setInterval(() => {
    void cache().set(heartbeatKey, "1", "EX", 45).catch(() => {});
  }, 15_000);
  logger.info("Worker ready");

  const shutdown = async () => {
    clearInterval(heartbeat);
    await Promise.all([email.close(), maintenance.close()]);
    await Promise.all([queue.close(), sqlClient.end(), cache().quit()]);
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
    void shutdown().catch(() => process.exit(1));
  });
}

main().catch(() => {
  logger.error("Worker startup failed");
  process.exit(1);
});
