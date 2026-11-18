CREATE TYPE "public"."application_stage" AS ENUM('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
ALTER TABLE "resumes" DROP CONSTRAINT "resumes_application_status_check";--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "tracker_stage" "application_stage";--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "tracker_history" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "tracker_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "salary" text;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "contacts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "interview_dates" date[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "excitement" smallint;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "tracker_reminders" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "jobs_follow_up_idx" ON "job_descriptions" USING btree ("follow_up_date") WHERE "job_descriptions"."archived_at" is null and "job_descriptions"."tracker_stage" is not null;--> statement-breakpoint
CREATE INDEX "jobs_interview_dates_idx" ON "job_descriptions" USING gin ("interview_dates") WHERE "job_descriptions"."archived_at" is null and "job_descriptions"."tracker_stage" is not null;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "jobs_excitement_check" CHECK ("job_descriptions"."excitement" between 1 and 5);--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_application_status_check" CHECK ("resumes"."application_status" in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'));
--> statement-breakpoint
WITH missing_jobs AS MATERIALIZED (
  SELECT id AS resume_id, gen_random_uuid() AS job_id, user_id,
         coalesce(job_title_snapshot, title) AS job_title, job_company_snapshot AS company
  FROM resumes
  WHERE kind = 'tailored' AND job_description_id IS NULL
), inserted AS (
  INSERT INTO job_descriptions (id, user_id, raw_text, job_title, company)
  SELECT job_id, user_id, '', job_title, company FROM missing_jobs
  RETURNING id
)
UPDATE resumes AS r SET job_description_id = m.job_id
FROM missing_jobs AS m JOIN inserted AS i ON i.id = m.job_id
WHERE r.id = m.resume_id;
--> statement-breakpoint
WITH latest AS (
  SELECT DISTINCT ON (user_id, job_description_id)
    user_id, job_description_id, application_status::application_stage AS stage,
    coalesce(application_status_updated_at, created_at) AS changed_at,
    coalesce(job_title_snapshot, title) AS title, job_company_snapshot AS company
  FROM resumes
  WHERE kind = 'tailored' AND job_description_id IS NOT NULL
  ORDER BY user_id, job_description_id, coalesce(application_status_updated_at, created_at) DESC, id
)
UPDATE job_descriptions AS j
SET tracker_stage = l.stage,
    tracker_updated_at = l.changed_at,
    tracker_history = jsonb_build_array(jsonb_build_object('stage', l.stage, 'at', l.changed_at)),
    job_title = coalesce(nullif(j.job_title, ''), l.title),
    company = coalesce(j.company, l.company)
FROM latest AS l WHERE j.id = l.job_description_id AND j.user_id = l.user_id;
