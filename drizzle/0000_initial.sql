CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"ok" boolean NOT NULL,
	"error_code" text,
	"latency_ms" integer NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"level" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" "inet",
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"payload" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "auth_tokens_purpose_check" CHECK ("auth_tokens"."purpose" in ('verify_email', 'reset_password', 'change_email'))
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "job_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"company" text,
	"job_title" text,
	"location" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"headline" text,
	"avatar_url" text,
	"phone" text,
	"location" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_resume_id" uuid,
	"onboarding_completed_at" timestamp with time zone,
	"gemini_key_ciphertext" "bytea",
	"gemini_key_last4" text,
	"gemini_key_status" text DEFAULT 'not_configured' NOT NULL,
	"gemini_key_updated_at" timestamp with time zone,
	"gemini_key_validated_at" timestamp with time zone,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_gemini_key_status_check" CHECK ("profiles"."gemini_key_status" in ('not_configured', 'valid', 'invalid'))
);
--> statement-breakpoint
CREATE TABLE "recovery_codes" (
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "recovery_codes_user_id_code_hash_pk" PRIMARY KEY("user_id","code_hash")
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source_resume_id" uuid,
	"source_resume_title_snapshot" text,
	"job_description_id" uuid,
	"job_title_snapshot" text,
	"job_company_snapshot" text,
	"tailoring_session_id" uuid,
	"original_file_storage_path" text,
	"original_file_name" text,
	"pdf_storage_path" text,
	"design_source_path" text,
	"pdf_generated_at" timestamp with time zone,
	"low_confidence_fields" text[] DEFAULT '{}' NOT NULL,
	"template" text DEFAULT 'classic' NOT NULL,
	"reviewed_change_ids" text[] DEFAULT '{}' NOT NULL,
	"application_status" text DEFAULT 'saved' NOT NULL,
	"application_status_updated_at" timestamp with time zone,
	"cover_letter" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_kind_check" CHECK ("resumes"."kind" in ('master', 'tailored')),
	CONSTRAINT "resumes_status_check" CHECK ("resumes"."status" in ('draft', 'archived')),
	CONSTRAINT "resumes_template_check" CHECK ("resumes"."template" in ('classic', 'modern', 'standard')),
	CONSTRAINT "resumes_application_status_check" CHECK ("resumes"."application_status" in ('saved', 'applied', 'interviewing', 'offer', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resume_id" uuid,
	"resume_text" text NOT NULL,
	"job_description_id" uuid NOT NULL,
	"report" jsonb NOT NULL,
	"match_rate" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scans_match_rate_check" CHECK ("scans"."match_rate" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" "inet",
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "tailoring_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_resume_id" uuid,
	"source_resume_title_snapshot" text,
	"job_description_id" uuid,
	"result_resume_id" uuid,
	"result_resume_title_snapshot" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"error_message" text,
	"change_explanations" jsonb,
	"stage" text,
	"job_analysis" jsonb,
	"source_snapshot" jsonb,
	"changes" jsonb,
	"summary" text,
	"score_before" smallint,
	"score_after" smallint,
	"usage" jsonb,
	"gemini_model" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tailoring_sessions_status_check" CHECK ("tailoring_sessions"."status" in ('pending', 'analyzing', 'generating', 'completed', 'failed')),
	CONSTRAINT "tailoring_sessions_error_code_check" CHECK ("tailoring_sessions"."error_code" in ('missing_api_key', 'invalid_api_key', 'invalid_jd', 'source_not_found', 'rate_limited', 'gemini_error', 'schema_validation_failed', 'fabrication_detected', 'timeout', 'unknown')),
	CONSTRAINT "tailoring_sessions_stage_check" CHECK ("tailoring_sessions"."stage" in ('copy', 'markup', 'set', 'proof', 'lockup')),
	CONSTRAINT "tailoring_sessions_score_before_check" CHECK ("tailoring_sessions"."score_before" between 0 and 100),
	CONSTRAINT "tailoring_sessions_score_after_check" CHECK ("tailoring_sessions"."score_after" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned_at" timestamp with time zone,
	"ban_reason" text,
	"totp_secret_ciphertext" "bytea",
	"totp_enabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_default_resume_id_resumes_id_fk" FOREIGN KEY ("default_resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_source_resume_id_resumes_id_fk" FOREIGN KEY ("source_resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_tailoring_session_id_tailoring_sessions_id_fk" FOREIGN KEY ("tailoring_session_id") REFERENCES "public"."tailoring_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_sessions" ADD CONSTRAINT "tailoring_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_sessions" ADD CONSTRAINT "tailoring_sessions_source_resume_id_resumes_id_fk" FOREIGN KEY ("source_resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_sessions" ADD CONSTRAINT "tailoring_sessions_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_sessions" ADD CONSTRAINT "tailoring_sessions_result_resume_id_resumes_id_fk" FOREIGN KEY ("result_resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_user_at_idx" ON "ai_calls" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "auth_tokens_expires_idx" ON "auth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "job_descriptions_user_id_idx" ON "job_descriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_default_resume_id_idx" ON "profiles" USING btree ("default_resume_id");--> statement-breakpoint
CREATE INDEX "resumes_user_id_idx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resumes_user_id_kind_idx" ON "resumes" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "resumes_one_default_master_per_user" ON "resumes" USING btree ("user_id") WHERE "resumes"."kind" = 'master' and "resumes"."is_default" = true;--> statement-breakpoint
CREATE INDEX "resumes_job_description_id_idx" ON "resumes" USING btree ("job_description_id");--> statement-breakpoint
CREATE INDEX "resumes_source_resume_id_idx" ON "resumes" USING btree ("source_resume_id");--> statement-breakpoint
CREATE INDEX "resumes_tailoring_session_id_idx" ON "resumes" USING btree ("tailoring_session_id");--> statement-breakpoint
CREATE INDEX "scans_user_idx" ON "scans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scans_resume_idx" ON "scans" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "scans_job_description_idx" ON "scans" USING btree ("job_description_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tailoring_sessions_user_id_idx" ON "tailoring_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tailoring_sessions_user_id_status_idx" ON "tailoring_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tailoring_sessions_result_resume_id_idx" ON "tailoring_sessions" USING btree ("result_resume_id");--> statement-breakpoint
CREATE INDEX "tailoring_sessions_source_resume_id_idx" ON "tailoring_sessions" USING btree ("source_resume_id");--> statement-breakpoint
CREATE INDEX "tailoring_sessions_job_description_id_idx" ON "tailoring_sessions" USING btree ("job_description_id");--> statement-breakpoint
CREATE INDEX "tailoring_sessions_user_created_idx" ON "tailoring_sessions" USING btree ("user_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER resumes_set_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
