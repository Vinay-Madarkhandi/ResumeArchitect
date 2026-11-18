DROP INDEX "scans_user_idx";--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "job_facts" jsonb;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "resume_label" text DEFAULT 'Resume' NOT NULL;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "resume_content" jsonb;--> statement-breakpoint
CREATE INDEX "scans_user_created_idx" ON "scans" USING btree ("user_id","created_at" DESC NULLS LAST);