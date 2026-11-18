"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { currentUser, sessionOptions } from "@/lib/auth/current-user";
import { dismissalCookie } from "@/lib/data/announcements";

export async function dismissAnnouncement(id: string) {
  const user = await currentUser();
  if (!user || !z.uuid().safeParse(id).success) return;

  const store = await cookies();
  const name = dismissalCookie(user.id);
  const previous = (store.get(name)?.value ?? "").split(",");
  const dismissed = [...new Set([id, ...previous])].filter((value) => z.uuid().safeParse(value).success).slice(0, 24);
  store.set(name, dismissed.join(","), { ...sessionOptions, maxAge: 30 * 86_400 });
}
