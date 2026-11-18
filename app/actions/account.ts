"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { currentUser, clearSessionCookie } from "@/lib/auth/current-user";
import { confirmCredentials, lockAccount } from "@/lib/auth/accounts";
import { clearSessionCache, removeSessions } from "@/lib/auth/sessions";
import { rateLimit } from "@/lib/cache/rateLimit";
import { clearAccountData } from "@/lib/data/account";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { deleteUserObjects } from "@/lib/storage";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./onboarding";

export async function deleteAllMyData(): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  try {
    await clearAccountData(user.id);
    await deleteUserObjects(user.id);
  } catch {
    logger.error({ userId: user.id }, "Could not finish clearing account data");
    return { ok: false, error: "Couldn't finish removing your data. Try again." };
  }
  redirect("/onboarding");
}

export async function deleteMyAccount(password: string, code: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (await rateLimit("credentials", user.id, 5, 900_000)) return { ok: false, error: "Too many attempts. Try again later." };
  try {
    const removed = await db.transaction(async (tx) => {
      const row = await lockAccount(tx, user.id);
      if (!row || !await confirmCredentials(tx, row, password, code)) return;
      const ids = await removeSessions(tx, user.id);
      await tx.delete(users).where(eq(users.id, user.id));
      await deleteUserObjects(user.id);
      return ids;
    });
    if (!removed) return { ok: false, error: "Check your password and authentication code." };
    await clearSessionCache(removed);
    await clearSessionCookie();
  } catch {
    logger.error({ userId: user.id }, "Could not finish deleting account");
    return { ok: false, error: "Couldn't finish deleting your account. Try again." };
  }
  redirect("/");
}
