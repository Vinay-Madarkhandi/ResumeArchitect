import { emailQueue, maintenanceQueue } from "@/lib/queue";

export const queueNames = ["email", "maintenance"] as const;
export type QueueName = typeof queueNames[number];
export const queueStates = ["waiting", "active", "delayed", "completed", "failed", "paused", "prioritized", "waiting-children"] as const;

export function operatorQueue(name: QueueName) {
  return name === "email" ? emailQueue() : maintenanceQueue();
}

export async function queueHealth(name: QueueName) {
  try {
    const queue = operatorQueue(name);
    const [counts, paused, workers] = await Promise.all([
      queue.getJobCounts(...queueStates), queue.isPaused(), queue.getWorkersCount(),
    ]);
    return { name, counts, paused, workers };
  } catch {
    return { name, counts: null, paused: false, workers: 0 };
  }
}

export async function failedJobs(name: QueueName) {
  try {
    const jobs = await operatorQueue(name).getFailed(0, 24);
    return jobs.flatMap((job) => job.id ? [{
      id: job.id, name: job.name, reason: job.failedReason?.slice(0, 500) || "Unknown",
      finishedOn: job.finishedOn,
    }] : []);
  } catch {
    return null;
  }
}
