import { Queue } from "bullmq";
import { redisUrl } from "@/lib/cache";

export type EmailJob =
  | { template: "verify" | "reset" | "changeEmail" | "signIn"; to: string; data: { link: string } }
  | { template: "alert"; to: string; data: { message: string } }
  | { template: "trackerDigest"; data: { userId: string; day: string } };
export type MaintenanceJob = "purge-auth" | "orphaned-objects" | "delete-user-objects" | "tracker-reminders";
export type MaintenancePayload = { userId?: string };
let emails: Queue<EmailJob> | undefined;
let maintenance: Queue<MaintenancePayload, void, MaintenanceJob> | undefined;

export function emailQueue() {
  return emails ??= new Queue<EmailJob>("email", {
    connection: { url: redisUrl(), maxRetriesPerRequest: 1, connectTimeout: 3000 },
    defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: true, removeOnFail: { age: 86_400 } },
  });
}

export function maintenanceQueue() {
  return maintenance ??= new Queue<MaintenancePayload, void, MaintenanceJob>("maintenance", {
    connection: { url: redisUrl(), maxRetriesPerRequest: 1, connectTimeout: 3000 },
    defaultJobOptions: { removeOnComplete: 100, removeOnFail: 100 },
  });
}
