import { and, count, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { Transaction } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Acquire before locking user rows when an operation can remove an active admin.
export async function lockAdminMembership(tx: Transaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('resume-architect:admin-membership'))`);
}

export async function countOtherActiveAdmins(tx: Transaction, id: string) {
  const [row] = await tx.select({ count: count() }).from(users).where(and(
    ne(users.id, id), eq(users.role, "admin"), isNull(users.banned_at), isNotNull(users.email_verified_at),
  ));
  return row.count;
}
