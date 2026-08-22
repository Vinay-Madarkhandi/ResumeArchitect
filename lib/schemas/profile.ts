import { z } from "zod";

export const ProfilePreferencesSchema = z.object({
  emailUpdates: z.boolean().default(true),
  productNews: z.boolean().default(false),
  defaultTemplate: z.enum(["modern-minimalist", "classic-professional"]).default("modern-minimalist"),
});
export type ProfilePreferences = z.infer<typeof ProfilePreferencesSchema>;

export const UpdateProfileInputSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(120),
  headline: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  location: z.string().max(120).optional(),
  links: z
    .array(z.object({ label: z.string().max(40), url: z.string().max(300) }))
    .max(6)
    .default([]),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const GeminiKeyStatus = z.enum(["not_configured", "valid", "invalid"]);
export type GeminiKeyStatusT = z.infer<typeof GeminiKeyStatus>;
