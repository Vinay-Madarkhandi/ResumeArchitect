ALTER TABLE "users" ADD COLUMN "password_set_at" timestamp with time zone;--> statement-breakpoint
-- Every verified password was chosen on a verify or reset link, except where an
-- administrator marked the address verified; those owners must reset first.
UPDATE "users" SET "password_set_at" = "email_verified_at"
  WHERE "email_verified_at" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "audit_log" WHERE "audit_log"."action" = 'user.verify' AND "audit_log"."target" = "users"."id"::text
  );
