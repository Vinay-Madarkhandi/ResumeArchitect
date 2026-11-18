# Architecture: self-hosted ResumeArchitect

Goal: everything Jobscan gives an individual job seeker, free, with the user's own
Gemini key. The app runs on one server under Docker Compose. No Supabase, no Vercel,
no third-party auth. Everything below is ours.

## Services (docker-compose.yml)

| Service      | Image / build              | Role |
|--------------|----------------------------|------|
| `web`        | this repo, Next.js standalone | UI, route handlers, server actions |
| `worker`     | this repo, `node dist/worker.js` (same image, other command) | BullMQ consumers: email, AI scans, cleanup, scheduled backups |
| `postgres`   | `postgres:17-alpine`       | system of record |
| `redis`      | `redis:7-alpine` (AOF on)  | sessions cache, rate limits, BullMQ |
| `localstack` | `localstack/localstack` (S3 only) | object storage, bucket `resume-uploads`, private |
| `migrate`    | same image, one-shot       | runs Drizzle migrations, then exits; `web`/`worker` depend on it |
| `caddy`      | `caddy:2` (profile `prod`) | TLS + reverse proxy to `web` |
| `backup`     | `postgres:17-alpine` loop (profile `prod`) | nightly `pg_dump` into the S3 bucket `backups` |

Dev: `docker compose up postgres redis localstack` and `npm run dev` on the host.
Prod: `docker compose --profile prod up -d`. All config through env (see `.env.example`).

## Code layout

```
lib/db/          Drizzle schema (schema.ts), client (index.ts), migrations in drizzle/
lib/auth/        password (argon2id), sessions, tokens, current-user, guards, totp
lib/storage/     S3 client (aws-sdk v3) against LocalStack; put/get/delete/presign
lib/cache/       Redis client (ioredis) + rate limiter (sliding window)
lib/queue/       BullMQ queue definitions + typed job payloads (shared by web and worker)
lib/email/       Resend client + React-free HTML templates (verify, reset, alerts)
worker/          worker entry: registers processors per queue
app/admin/       admin panel (role = admin)
```

`lib/supabase/` and every `@supabase/*` import are deleted. Data access goes through
Drizzle with an explicit `userId` filter on every query (no RLS any more, so ownership
checks are the app's job). Put those queries in small per-entity modules
(`lib/data/resumes.ts`, ...) that take `userId` first, so a missing filter is visible.

## Auth (our own)

- Email + password. Password hashing: argon2id via `@node-rs/argon2`
  (m=19456 KiB, t=2, p=1, per OWASP). Minimum 10 characters, checked against a short
  common-password list.
- Sessions: random 32-byte token in an `HttpOnly; Secure; SameSite=Lax; Path=/`
  cookie `ra_session`. Only `sha256(token)` is stored, in `sessions` (Postgres) with
  `expires_at` (30 days sliding, renewed when < 15 days left). Redis caches the
  session lookup for 5 min; revocation deletes both.
- CSRF: mutations are server actions (Next checks Origin) or route handlers that
  check `Origin` against `APP_URL` in one helper.
- Email verification and password reset: random token emailed as a link, stored as
  `sha256`, single use, expiry 24 h / 1 h. Reset revokes all sessions.
- Proving the inbox always wins. Until an address is verified, its password is
  provisional: signing up again replaces it and sends a fresh link, the verify page
  sets the password the inbox owner types there, and a reset link also verifies.
  Unverified accounts are deleted 7 days after their last link expired.
- Rate limits (Redis): sign-in 5/15 min per email+IP and 20 failures/h per email (sliding, so it lapses), sign-up 5/h per IP, reset 3/h per
  email, AI endpoints per user.
- Optional TOTP 2FA (`otpauth`), with 10 hashed recovery codes.
- "Sign out everywhere", change email (re-verify), change password, delete account
  (cascades rows + S3 objects), export my data (JSON zip).
- Roles: `user`, `admin`. `ADMIN_EMAILS` grants admin when such an address is verified,
  and at boot to verified accounts only.
  Banned users cannot sign in; their sessions are revoked.

`proxy.ts` (Next 16 middleware) only checks that the cookie exists for protected
paths. The real check is `requireUser()` in each page, action and handler.

## Data model (Postgres, Drizzle)

Existing tables move over with the same columns, minus Supabase specifics:
`profiles` (keyed by `users.id`), `resumes`, `job_descriptions`,
`tailoring_sessions`, and the tracker / cover-letter / usage tables from
`supabase/migrations/20261118090000_*`. Storage paths keep their shape.

New tables:

- `users` (id uuid, email citext unique, email_verified_at, password_hash, role,
  banned_at, ban_reason, totp_secret_ciphertext, totp_enabled_at, created_at,
  last_sign_in_at)
- `sessions` (id = sha256 token, user_id, created_at, expires_at, ip, user_agent)
- `auth_tokens` (sha256 token, user_id, purpose `verify_email|reset_password|change_email`,
  payload jsonb, expires_at, used_at)
- `recovery_codes` (user_id, code_hash, used_at)
- `scans` (match-report results: user_id, resume_id nullable, resume_text snapshot,
  job_description_id, report jsonb, match_rate int, created_at); the scanner works
  without tailoring
- `audit_log` (actor_id, action, target, meta jsonb, ip, at)
- `ai_calls` (user_id, kind, model, ok, error_code, latency_ms, tokens_in/out, at); this
  feeds usage stats and the admin panel. Never stores prompts or keys.
- `announcements` (body, level, starts_at, ends_at)
- `feature_flags` (key, enabled, note)

The user's Gemini key stays encrypted with `lib/crypto/keyCipher.ts` (AES-GCM with
the server master key `KEY_ENCRYPTION_SECRET`). It is never logged or returned.

## Queues (BullMQ on Redis)

- `email`: {template, to, data}; 5 attempts, exponential backoff. A delivered job is
  removed at once; a job out of attempts is kept for a day with its link blanked.
- `maintenance`: repeatable jobs: purge expired sessions, week-old expired tokens and
  abandoned unverified accounts hourly, orphaned S3 objects daily.
Jobs carry ids derived from their purpose (e.g. `verify:<userId>:<tokenHash>`) so a
retry or a double click doesn't send twice.

## Email (Resend)

`RESEND_API_KEY`, `EMAIL_FROM`. In dev and tests without a key, the email adapter
writes messages to Redis list `dev:mailbox` and to the log, and an e2e helper reads
it, so the verification and reset flows are tested end to end.

## Admin panel (`/admin`)

Overview (users, sign-ups per day, scans and tailorings per day, AI error rate),
Users (search, view, verify, ban/unban, revoke sessions, delete), AI calls (errors by
code), Queues (counts, failed jobs, retry), Audit log, Announcements, Feature flags.
Every admin action writes `audit_log`.

## Health and operations

`GET /api/health` checks Postgres, Redis and S3; compose healthchecks use it.
Logs are JSON lines on stdout (pino). Backups: nightly `pg_dump` to S3 `backups/`
with 14-day retention; `scripts/restore.sh` documents restore.
