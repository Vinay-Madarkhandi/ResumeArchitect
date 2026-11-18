CREATE TABLE "resume_shares" (
	"resume_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"password_hash" text,
	"content" jsonb NOT NULL,
	"template" text NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_shares_slug_unique" UNIQUE("slug"),
	CONSTRAINT "resume_shares_slug_check" CHECK ("resume_shares"."slug" ~ '^[A-Za-z0-9_-]{43}$')
);
--> statement-breakpoint
ALTER TABLE "resume_shares" ADD CONSTRAINT "resume_shares_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;