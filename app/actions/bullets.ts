"use server";

import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { forgetBullet, listBullets, rememberBullets, syncBulletBank, type SavedBullet } from "@/lib/data/bullets";

const BulletsSchema = z.array(z.object({
  key: z.string().min(1).max(1_000),
  markdown: z.string().min(1).max(1_000),
  section: z.string().max(200).nullable(),
  role: z.string().max(200).nullable(),
})).max(200);

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function loadBulletBank(): Promise<Result<SavedBullet[]>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  try {
    return { ok: true, data: await syncBulletBank(user.id) };
  } catch {
    return { ok: false, error: "Couldn't load your career history." };
  }
}

/** Keeps bullets in the bank before a resume drops them, so toggling off never loses one. */
export async function saveToBank(bullets: unknown, resumeId: string | null): Promise<Result<SavedBullet[]>> {
  const parsed = BulletsSchema.safeParse(bullets);
  if (!parsed.success) return { ok: false, error: "Those bullets couldn't be saved." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  try {
    await rememberBullets(user.id, parsed.data, resumeId ?? undefined);
    return { ok: true, data: await listBullets(user.id) };
  } catch {
    return { ok: false, error: "Couldn't save to your career history." };
  }
}

export async function removeFromBank(bulletId: string): Promise<Result<null>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const removed = await forgetBullet(user.id, bulletId).catch(() => false);
  return removed ? { ok: true, data: null } : { ok: false, error: "That bullet is already gone." };
}
