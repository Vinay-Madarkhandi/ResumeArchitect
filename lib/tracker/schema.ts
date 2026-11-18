import { z } from "zod";
import { stages } from "./stages";

const webUrl = z.url({ protocol: /^https?$/ }).max(2048).or(z.literal(""));
const contactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().max(160),
  email: z.email().max(254).or(z.literal("")),
  linkedin: webUrl,
});

export const jobClipSchema = z.object({
  title: z.string().trim().min(1, "Enter a job title.").max(250),
  company: z.string().trim().max(250).default(""),
  location: z.string().trim().max(250).default(""),
  salary: z.string().trim().max(250).default(""),
  url: webUrl.default(""),
  description: z.string().max(50_000).default(""),
});

export const jobSchema = jobClipSchema.extend({
  stage: z.enum(stages).default("saved"),
  notes: z.string().max(20_000).default(""),
  contacts: z.array(contactSchema).max(25).default([]),
  interviews: z.array(z.iso.date()).max(50).default([]).transform((dates) => [...new Set(dates)].sort()),
  followUp: z.iso.date().nullable().default(null),
  excitement: z.number().int().min(1).max(5).nullable().default(null),
});

export const historySchema = z.array(z.object({ stage: z.enum(stages), at: z.iso.datetime({ offset: true }) })).min(1);
export type StageChange = z.infer<typeof historySchema>[number];
export type Contact = z.infer<typeof contactSchema>;
export type JobInput = z.infer<typeof jobSchema>;
export type JobRecord = JobInput & { archived: boolean; history: StageChange[]; updatedAt: string };
