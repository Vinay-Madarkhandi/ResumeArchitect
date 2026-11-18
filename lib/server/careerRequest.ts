import { NextResponse } from "next/server";
import type { z } from "zod";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import type { Outcome } from "./careerTarget";

/** Origin check, signed-in user, and a body parsed with `schema`, with the first problem as the error. */
export async function careerRequest<T>(request: Request, schema: z.ZodType<T>): Promise<Outcome<{ userId: string; body: T }>> {
  const originError = checkOrigin(request);
  if (originError) return { ok: false, response: originError };
  const user = await currentUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 }) };
  }
  return { ok: true, value: { userId: user.id, body: parsed.data } };
}
