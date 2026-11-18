import { eq } from "drizzle-orm";
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
