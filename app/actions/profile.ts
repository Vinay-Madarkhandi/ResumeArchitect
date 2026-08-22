"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { UpdateProfileInputSchema } from "@/lib/schemas/profile";
import type { ActionResult } from "./onboarding";

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = UpdateProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { fullName, headline, phone, location, links } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, headline: headline || null, phone: phone || null, location: location || null, links })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
