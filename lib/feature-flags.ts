import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";

export const featureDefinitions = {
  announcements: { enabled: true, note: "Show service announcements in signed-in areas." },
} as const;

export type FeatureKey = keyof typeof featureDefinitions;

export async function isEnabled(key: FeatureKey): Promise<boolean> {
  const [flag] = await db.select({ enabled: featureFlags.enabled }).from(featureFlags)
    .where(eq(featureFlags.key, key));
  return flag?.enabled ?? featureDefinitions[key].enabled;
}

export async function listFeatureFlags() {
  const rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.key));
  const persisted = new Set(rows.map(({ key }) => key));
  return [...rows, ...Object.entries(featureDefinitions)
    .filter(([key]) => !persisted.has(key))
    .map(([key, definition]) => ({ key, ...definition }))];
}
