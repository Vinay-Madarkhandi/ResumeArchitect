CREATE TABLE "career_bullets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"markdown" text NOT NULL,
	"section" text,
	"role" text,
	"source_resume_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "career_bullets" ADD CONSTRAINT "career_bullets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_bullets" ADD CONSTRAINT "career_bullets_source_resume_id_resumes_id_fk" FOREIGN KEY ("source_resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "career_bullets_user_key_idx" ON "career_bullets" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "career_bullets_source_resume_idx" ON "career_bullets" USING btree ("source_resume_id");