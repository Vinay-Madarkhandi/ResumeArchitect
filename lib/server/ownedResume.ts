import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Owned =
  | { ok: true; supabase: SupabaseClient<Database>; user: User }
  | { ok: false; response: NextResponse };

/**
 * Signed-in user who owns resume `id`, or the 401/404 response to return.
 * RLS enforces ownership too; this turns "no row" into a clear 404 early.
 */
export async function requireOwnedResume(id: string): Promise<Owned> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  const { data } = await supabase.from("resumes").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return { ok: false, response: NextResponse.json({ error: "Resume not found." }, { status: 404 }) };
  return { ok: true, supabase, user };
}
