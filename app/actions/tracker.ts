"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { setTrackerReminders } from "@/lib/data/tracker-reminders";

export async function updateTrackerReminders(_previous: string, form: FormData) {
  const user = await requireUser();
  await setTrackerReminders(user.id, form.get("enabled") === "on");
  revalidatePath("/settings");
  return "Reminder preference saved.";
}
