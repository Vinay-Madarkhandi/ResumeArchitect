CREATE TABLE "cover_letter_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resume_id" uuid,
	"job_description_id" uuid,
	"target_label" text NOT NULL,
	"letter" text NOT NULL,
	"report" jsonb NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cover_letter_scans_score_check" CHECK ("cover_letter_scans"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "interview_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"answer" text NOT NULL,
	"feedback" jsonb NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_answers_score_check" CHECK ("interview_answers"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resume_id" uuid,
	"job_description_id" uuid,
	"target_label" text NOT NULL,
	"job_analysis" jsonb NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linkedin_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_label" text,
	"job_analysis" jsonb,
	"resume_id" uuid,
	"job_description_id" uuid,
	"profile" jsonb NOT NULL,
	"report" jsonb NOT NULL,
	"suggestions" jsonb,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linkedin_reviews_score_check" CHECK ("linkedin_reviews"."score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "cover_letter_scans" ADD CONSTRAINT "cover_letter_scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letter_scans" ADD CONSTRAINT "cover_letter_scans_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letter_scans" ADD CONSTRAINT "cover_letter_scans_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linkedin_reviews" ADD CONSTRAINT "linkedin_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linkedin_reviews" ADD CONSTRAINT "linkedin_reviews_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linkedin_reviews" ADD CONSTRAINT "linkedin_reviews_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cover_letter_scans_user_created_idx" ON "cover_letter_scans" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cover_letter_scans_resume_idx" ON "cover_letter_scans" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "cover_letter_scans_job_description_idx" ON "cover_letter_scans" USING btree ("job_description_id");--> statement-breakpoint
CREATE INDEX "interview_answers_session_idx" ON "interview_answers" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "interview_answers_user_idx" ON "interview_answers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_user_created_idx" ON "interview_sessions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interview_sessions_resume_idx" ON "interview_sessions" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_job_description_idx" ON "interview_sessions" USING btree ("job_description_id");--> statement-breakpoint
CREATE INDEX "linkedin_reviews_user_created_idx" ON "linkedin_reviews" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "linkedin_reviews_resume_idx" ON "linkedin_reviews" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "linkedin_reviews_job_description_idx" ON "linkedin_reviews" USING btree ("job_description_id");