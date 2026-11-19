import { z } from "zod";
import { stages } from "./stages";

/** Postgres text and jsonb reject U+0000, so a pasted NUL would fail the write; drop it before validating. */
const text = (schema: z.ZodString) => z.preprocess((value) => typeof value === "string" ? value.replaceAll("\0", "") : value, schema);

export const postingUrlSchema = z.url({ protocol: /^https?$/ }).max(2048).or(z.literal(""));
const contactSchema = z.object({
  name: text(z.string().trim().min(1).max(160)),
  role: text(z.string().trim().max(160)),
  email: z.email().max(254).or(z.literal("")),
  linkedin: postingUrlSchema,
});

export const jobClipSchema = z.object({
  title: text(z.string().trim().min(1, "Enter a job title.").max(250)),
  company: text(z.string().trim().max(250)).default(""),
  location: text(z.string().trim().max(250)).default(""),
  salary: text(z.string().trim().max(250)).default(""),
  url: postingUrlSchema.default(""),
  description: text(z.string().max(50_000)).default(""),
});

export const jobSchema = jobClipSchema.extend({
  stage: z.enum(stages).default("saved"),
  notes: text(z.string().max(20_000)).default(""),
  contacts: z.array(contactSchema).max(25).default([]),
  interviews: z.array(z.iso.date()).max(50).default([]).transform((dates) => [...new Set(dates)].sort()),
  followUp: z.iso.date().nullable().default(null),
  excitement: z.number().int().min(1).max(5).nullable().default(null),
});

export const historySchema = z.array(z.object({ stage: z.enum(stages), at: z.iso.datetime({ offset: true }) })).min(1);
export type StageChange = z.infer<typeof historySchema>[number];
export type Contact = z.infer<typeof contactSchema>;
export type JobClip = z.infer<typeof jobClipSchema>;
export type JobInput = z.infer<typeof jobSchema>;
export type JobRecord = JobInput & { archived: boolean; history: StageChange[]; updatedAt: string };
