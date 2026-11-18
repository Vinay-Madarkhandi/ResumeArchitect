import { eq } from "drizzle-orm";
import { db, type Transaction } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { type AdminActor, lockAdminSession } from "./authorization";

export async function audit(
  tx: Transaction,
  actor: AdminActor,
  action: string,
  target: string,
  meta: Record<string, string | boolean> = {},
) {
  const [row] = await tx.insert(auditLog).values({
    actor_id: actor.id, ip: actor.ip, action, target, meta,
  }).returning({ id: auditLog.id });
  return row.id;
}

// Queue operations cross the Postgres/Redis boundary. Persist intent before
// calling Redis so a crash still leaves an audit record with an unknown outcome.
export async function auditExternal(
  actor: AdminActor,
  action: string,
  target: string,
  run: () => Promise<boolean>,
) {
  const id = await db.transaction(async (tx) => {
    await lockAdminSession(tx, actor);
    return audit(tx, actor, action, target, { outcome: "pending" });
  });

  let outcome = "failed";
  try {
    outcome = await run() ? "completed" : "skipped";
  } finally {
    await db.update(auditLog).set({ meta: { outcome } }).where(eq(auditLog.id, id));
  }
  return outcome === "completed";
}
