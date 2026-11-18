"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { createPersonalToken, revokePersonalToken } from "@/lib/auth/personal-tokens";
import { rateLimit } from "@/lib/cache/rateLimit";

export type TokenActionState = { token?: string; error?: string };

export async function issueClipperToken(_previous: TokenActionState, form: FormData): Promise<TokenActionState> {
  const user = await requireUser();
  const name = z.string().trim().min(1).max(80).safeParse(form.get("name"));
  if (!name.success) return { error: "Enter a token name of up to 80 characters." };
  const wait = await rateLimit("clipper-token-create", user.id, 20, 3_600_000);
  if (wait > 0) return { error: "Too many tokens created. Try again later." };
  const token = await createPersonalToken(user.id, name.data);
  revalidatePath("/settings");
  return { token };
}

export async function revokeClipperToken(id: string) {
  const user = await requireUser();
  await revokePersonalToken(user.id, id);
  revalidatePath("/settings");
}
