"use server";

import { redirect } from "next/navigation";
import { currentUser, clearSessionCookie } from "@/lib/auth/current-user";
import { confirmCredentials, lockAccount } from "@/lib/auth/accounts";
import { rateLimit } from "@/lib/cache/rateLimit";
import { countOtherActiveAdmins, lockAdminMembership } from "@/lib/auth/admin-membership";
import { clearAccountData, deleteAccountRows, finishAccountDeletion } from "@/lib/data/account";
import { db } from "@/lib/db";
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
      await lockAdminMembership(tx);
      const row = await lockAccount(tx, user.id);
      if (!row || !await confirmCredentials(tx, row, password, code)) return;
      if (row.role === "admin" && !await countOtherActiveAdmins(tx, user.id)) return "last-admin" as const;
      return deleteAccountRows(tx, user.id);
    });
    if (!removed) return { ok: false, error: "Check your password and authentication code." };
    if (removed === "last-admin") return { ok: false, error: "Assign another active administrator before deleting your account." };
    await clearSessionCookie();
    await finishAccountDeletion(user.id, removed);
  } catch {
    logger.error({ userId: user.id }, "Could not finish deleting account");
    return { ok: false, error: "Couldn't finish deleting your account. Try again." };
  }
  redirect("/");
}
