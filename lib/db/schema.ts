import { sql } from "drizzle-orm";
import {
  type AnyPgColumn, boolean, check, customType, index, inet, integer, jsonb,
  pgTable, primaryKey, smallint, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import type { Link, ResumeContent } from "@/lib/schemas/resume";
import type { DocumentContent } from "@/lib/schemas/document";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import type { PipelineStage, TailoredChange } from "@/lib/schemas/tailoring";
import { TEMPLATE_IDS } from "@/lib/resume/templates";

const date = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });
const created = () => date("created_at").notNull().defaultNow();
const id = () => uuid("id").primaryKey().defaultRandom();
const owner = () => uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" });
const citext = customType<{ data: string }>({ dataType: () => "citext" });
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const users = pgTable("users", {
  id: id(),
  email: citext("email").notNull().unique(),
  email_verified_at: date("email_verified_at"),
  password_hash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  banned_at: date("banned_at"),
  ban_reason: text("ban_reason"),
  totp_secret_ciphertext: bytea("totp_secret_ciphertext"),
  totp_enabled_at: date("totp_enabled_at"),
  created_at: created(),
  last_sign_in_at: date("last_sign_in_at"),
}, (t) => [check("users_role_check", sql`${t.role} in ('user', 'admin')`)]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  full_name: text("full_name"),
  headline: text("headline"),
  avatar_url: text("avatar_url"),
  phone: text("phone"),
  location: text("location"),
  links: jsonb("links").$type<Link[]>().notNull().default([]),
  default_resume_id: uuid("default_resume_id").references((): AnyPgColumn => resumes.id, { onDelete: "set null" }),
  onboarding_completed_at: date("onboarding_completed_at"),
  gemini_key_ciphertext: bytea("gemini_key_ciphertext"),
  gemini_key_last4: text("gemini_key_last4"),
  gemini_key_status: text("gemini_key_status", { enum: ["not_configured", "valid", "invalid"] }).notNull().default("not_configured"),
  gemini_key_updated_at: date("gemini_key_updated_at"),
  gemini_key_validated_at: date("gemini_key_validated_at"),
  preferences: jsonb("preferences").notNull().default({}),
  created_at: created(),
  updated_at: date("updated_at").notNull().defaultNow(),
}, (t) => [
  check("profiles_gemini_key_status_check", sql`${t.gemini_key_status} in ('not_configured', 'valid', 'invalid')`),
  index("profiles_default_resume_id_idx").on(t.default_resume_id),
]);

export const jobDescriptions = pgTable("job_descriptions", {
  id: id(),
  user_id: owner(),
  raw_text: text("raw_text").notNull(),
  company: text("company"),
  job_title: text("job_title"),
  location: text("location"),
  source_url: text("source_url"),
  created_at: created(),
}, (t) => [index("job_descriptions_user_id_idx").on(t.user_id)]);

export const resumes = pgTable("resumes", {
  id: id(),
  user_id: owner(),
  kind: text("kind", { enum: ["master", "tailored"] }).notNull(),
  title: text("title").notNull(),
  content: jsonb("content").$type<DocumentContent | ResumeContent>().notNull().default(sql`'{}'::jsonb`),
  status: text("status", { enum: ["draft", "archived"] }).notNull().default("draft"),
  is_default: boolean("is_default").notNull().default(false),
  version: integer("version").notNull().default(1),
  source_resume_id: uuid("source_resume_id").references((): AnyPgColumn => resumes.id, { onDelete: "set null" }),
  source_resume_title_snapshot: text("source_resume_title_snapshot"),
  job_description_id: uuid("job_description_id").references(() => jobDescriptions.id, { onDelete: "set null" }),
  job_title_snapshot: text("job_title_snapshot"),
  job_company_snapshot: text("job_company_snapshot"),
  tailoring_session_id: uuid("tailoring_session_id").references((): AnyPgColumn => tailoringSessions.id, { onDelete: "set null" }),
  original_file_storage_path: text("original_file_storage_path"),
  original_file_name: text("original_file_name"),
  pdf_storage_path: text("pdf_storage_path"),
  design_source_path: text("design_source_path"),
  pdf_generated_at: date("pdf_generated_at"),
  low_confidence_fields: text("low_confidence_fields").array().notNull().default(sql`'{}'`),
  template: text("template", { enum: TEMPLATE_IDS }).notNull().default("classic"),
  reviewed_change_ids: text("reviewed_change_ids").array().notNull().default(sql`'{}'`),
  application_status: text("application_status", { enum: ["saved", "applied", "interviewing", "offer", "rejected"] }).notNull().default("saved"),
  application_status_updated_at: date("application_status_updated_at"),
  cover_letter: text("cover_letter"),
  created_at: created(),
  updated_at: date("updated_at").notNull().defaultNow(),
}, (t) => [
  check("resumes_kind_check", sql`${t.kind} in ('master', 'tailored')`),
  check("resumes_status_check", sql`${t.status} in ('draft', 'archived')`),
  check("resumes_template_check", sql`${t.template} in (${sql.raw(TEMPLATE_IDS.map((id) => `'${id}'`).join(", "))})`),
  check("resumes_application_status_check", sql`${t.application_status} in ('saved', 'applied', 'interviewing', 'offer', 'rejected')`),
  index("resumes_user_id_idx").on(t.user_id),
  index("resumes_user_id_kind_idx").on(t.user_id, t.kind),
  uniqueIndex("resumes_one_default_master_per_user").on(t.user_id).where(sql`${t.kind} = 'master' and ${t.is_default} = true`),
  index("resumes_job_description_id_idx").on(t.job_description_id),
  index("resumes_source_resume_id_idx").on(t.source_resume_id),
  index("resumes_tailoring_session_id_idx").on(t.tailoring_session_id),
]);

export const tailoringSessions = pgTable("tailoring_sessions", {
  id: id(),
  user_id: owner(),
  source_resume_id: uuid("source_resume_id").references(() => resumes.id, { onDelete: "set null" }),
  source_resume_title_snapshot: text("source_resume_title_snapshot"),
  job_description_id: uuid("job_description_id").references(() => jobDescriptions.id, { onDelete: "set null" }),
  result_resume_id: uuid("result_resume_id").references(() => resumes.id, { onDelete: "set null" }),
  result_resume_title_snapshot: text("result_resume_title_snapshot"),
  status: text("status", { enum: ["pending", "analyzing", "generating", "completed", "failed"] }).notNull().default("pending"),
  error_code: text("error_code"),
  error_message: text("error_message"),
  change_explanations: jsonb("change_explanations"),
  stage: text("stage").$type<PipelineStage>(),
  job_analysis: jsonb("job_analysis").$type<JobAnalysis>(),
  source_snapshot: jsonb("source_snapshot").$type<DocumentContent>(),
  changes: jsonb("changes").$type<TailoredChange[]>(),
  summary: text("summary"),
  score_before: smallint("score_before"),
  score_after: smallint("score_after"),
  usage: jsonb("usage"),
  gemini_model: text("gemini_model"),
  started_at: date("started_at"),
  completed_at: date("completed_at"),
  created_at: created(),
}, (t) => [
  check("tailoring_sessions_status_check", sql`${t.status} in ('pending', 'analyzing', 'generating', 'completed', 'failed')`),
  check("tailoring_sessions_error_code_check", sql`${t.error_code} in ('missing_api_key', 'invalid_api_key', 'invalid_jd', 'source_not_found', 'rate_limited', 'gemini_error', 'schema_validation_failed', 'fabrication_detected', 'timeout', 'unknown')`),
  check("tailoring_sessions_stage_check", sql`${t.stage} in ('copy', 'markup', 'set', 'proof', 'lockup')`),
  check("tailoring_sessions_score_before_check", sql`${t.score_before} between 0 and 100`),
  check("tailoring_sessions_score_after_check", sql`${t.score_after} between 0 and 100`),
  index("tailoring_sessions_user_id_idx").on(t.user_id),
  index("tailoring_sessions_user_id_status_idx").on(t.user_id, t.status),
  index("tailoring_sessions_result_resume_id_idx").on(t.result_resume_id),
  index("tailoring_sessions_source_resume_id_idx").on(t.source_resume_id),
  index("tailoring_sessions_job_description_id_idx").on(t.job_description_id),
  index("tailoring_sessions_user_created_idx").on(t.user_id, t.created_at.desc()),
]);

/** Career history: every bullet the user has written, kept even when no resume uses it (lib/resume/bulletBank.ts). */
export const careerBullets = pgTable("career_bullets", {
  id: id(),
  user_id: owner(),
  key: text("key").notNull(),
  markdown: text("markdown").notNull(),
  section: text("section"),
  role: text("role"),
  source_resume_id: uuid("source_resume_id").references(() => resumes.id, { onDelete: "set null" }),
  created_at: created(),
}, (t) => [
  uniqueIndex("career_bullets_user_key_idx").on(t.user_id, t.key),
  index("career_bullets_source_resume_idx").on(t.source_resume_id),
]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  user_id: owner(),
  created_at: created(),
  expires_at: date("expires_at").notNull(),
  ip: inet("ip"),
  user_agent: text("user_agent"),
}, (t) => [index("sessions_user_idx").on(t.user_id), index("sessions_expires_idx").on(t.expires_at)]);

export const authTokens = pgTable("auth_tokens", {
  id: text("id").primaryKey(),
  user_id: owner(),
  purpose: text("purpose", { enum: ["verify_email", "reset_password", "change_email"] }).notNull(),
  payload: jsonb("payload").$type<{ email?: string }>(),
  expires_at: date("expires_at").notNull(),
  used_at: date("used_at"),
}, (t) => [
  check("auth_tokens_purpose_check", sql`${t.purpose} in ('verify_email', 'reset_password', 'change_email')`),
  index("auth_tokens_user_idx").on(t.user_id, t.purpose),
  index("auth_tokens_expires_idx").on(t.expires_at),
]);

export const recoveryCodes = pgTable("recovery_codes", {
  user_id: owner(),
  code_hash: text("code_hash").notNull(),
  used_at: date("used_at"),
}, (t) => [primaryKey({ columns: [t.user_id, t.code_hash] })]);

export const scans = pgTable("scans", {
  id: id(),
  user_id: owner(),
  resume_id: uuid("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  resume_text: text("resume_text").notNull(),
  job_description_id: uuid("job_description_id").notNull().references(() => jobDescriptions.id, { onDelete: "cascade" }),
  report: jsonb("report").notNull(),
  match_rate: integer("match_rate").notNull(),
  created_at: created(),
}, (t) => [
  index("scans_user_idx").on(t.user_id), index("scans_resume_idx").on(t.resume_id),
  index("scans_job_description_idx").on(t.job_description_id),
  check("scans_match_rate_check", sql`${t.match_rate} between 0 and 100`),
]);

export const auditLog = pgTable("audit_log", {
  id: id(),
  actor_id: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  target: text("target"),
  meta: jsonb("meta").notNull().default({}),
  ip: inet("ip"),
  at: date("at").notNull().defaultNow(),
}, (t) => [index("audit_log_actor_idx").on(t.actor_id), index("audit_log_at_idx").on(t.at)]);

export const aiCalls = pgTable("ai_calls", {
  id: id(),
  user_id: owner(),
  kind: text("kind").notNull(),
  model: text("model").notNull(),
  ok: boolean("ok").notNull(),
  error_code: text("error_code"),
  latency_ms: integer("latency_ms").notNull(),
  tokens_in: integer("tokens_in"),
  tokens_out: integer("tokens_out"),
  at: date("at").notNull().defaultNow(),
}, (t) => [index("ai_calls_user_at_idx").on(t.user_id, t.at)]);

export const announcements = pgTable("announcements", {
  id: id(),
  body: text("body").notNull(),
  level: text("level").notNull(),
  starts_at: date("starts_at").notNull(),
  ends_at: date("ends_at"),
});

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  note: text("note"),
});

export type ApplicationStatus = typeof resumes.$inferSelect.application_status;
