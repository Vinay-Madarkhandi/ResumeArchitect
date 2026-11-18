-- An account without a proven password has no active credentials: whatever it
-- signed in with before 0009 must go through a reset first.
DELETE FROM "sessions" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "password_set_at" IS NULL);--> statement-breakpoint
DELETE FROM "personal_api_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "password_set_at" IS NULL);
