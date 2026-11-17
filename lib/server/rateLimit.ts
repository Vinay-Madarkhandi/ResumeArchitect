import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Tailoring runs allowed per user per rolling hour. Each run costs several Gemini calls on their key. */
export const RUNS_PER_HOUR = 20;

/**
 * Counts the user's runs in the last hour. Returns the minutes until a slot
 * frees up when they're over the limit, or null when they may run.
 */
export async function tailoringRateLimit(supabase: SupabaseClient<Database>, userId: string): Promise<number | null> {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { data, count } = await supabase
    .from("tailoring_sessions")
    .select("created_at", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(1);
  if ((count ?? 0) < RUNS_PER_HOUR) return null;
  const oldest = data?.[0]?.created_at ? new Date(data[0].created_at).getTime() : Date.now();
  return Math.max(1, Math.ceil((oldest + 3_600_000 - Date.now()) / 60_000));
}
