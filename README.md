# ResumeArchitect

Tailor a resume to a specific job using your own Gemini API key, and see exactly what changed.

You paste a job post. ResumeArchitect:

1. **Reads the job:** Gemini extracts the must-haves, nice-to-haves, and the keywords recruiters search for.
2. **Measures your resume:** a deterministic score is computed against those requirements.
3. **Rewrites lines:** Gemini edits numbered lines of your real resume. It isn't allowed to invent experience.
4. **Proofs every edit:** any new number, name, or skill your original doesn't back up is flagged.
5. **Scores the result:** the same yardstick is applied again, so before → after is a fair comparison.

You then review a word-level redline of every change with its reason. You keep or revert each one, edit the page in place (or select text and ask AI to rewrite it), compare it with the original, and download PDF or Word.

## How it's built

| Area | Where |
| --- | --- |
| Resume model (flat lines), diff, per-change revert | `lib/resume/` |
| Explainable match score + ATS checks | `lib/scoring/score.ts` |
| Gemini structured calls (timeouts, retries, error codes) | `lib/gemini/model.ts`, `lib/gemini/prompts/` |
| Five-stage pipeline, streamed as NDJSON | `lib/tailoring/pipeline.ts`, `app/api/tailoring/route.ts` |
| Import (PDF/DOCX/text → structured resume) | `lib/server/importResume.ts` |
| PDF / DOCX export (exactly what's on screen) | `lib/pdf/`, `lib/docx/`, `app/api/resumes/[id]/export` |
| Workspace UI (Review / Edit / Compare, score rail) | `components/workspace/` |
| Design system (dark-first, graphite + brass) | `app/globals.css`, `components/ui/`, `DESIGN.md` |

The AI never produces the score. It extracts the job's requirements once, stores them with the application, and the score is computed in code from those requirements. The score therefore updates live as you edit.

Each application stores a snapshot of the source resume, so "original" never drifts when the master resume is edited later.

## Run it locally

Use Node.js 22 and Docker with the Compose plugin.

```bash
npm ci
cp .env.example .env
openssl rand -base64 32         # Paste the output into KEY_ENCRYPTION_SECRET in .env
docker compose up -d --wait postgres redis localstack
npm run build:worker
npm run db:migrate
npm run worker                  # Leave this running for email and scheduled jobs
```

In a second terminal, run `npm run dev -- --port 3100` and open [localhost:3100](http://localhost:3100).
Create an account and open the latest message in the development mailbox. Leave `RESEND_API_KEY` empty to use this mailbox.

```bash
docker compose exec -T redis redis-cli --raw LINDEX dev:mailbox 0
```

Open the `data.link` value and enter the password you used to sign up. Then connect your own Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey).

To run the web app and worker in containers too, use `docker compose up -d --build --wait`. The `migrate` service applies pending migrations before both start. Check the stack with `curl -fsS http://localhost:3100/api/health`.

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The unit suite uses embedded Postgres and an in-memory Redis test adapter. Playwright uses the running Compose Postgres, Redis and S3 services. It builds the standalone web app and starts it alongside a local email worker and fake Gemini server, signs up in the browser and retrieves verification and reset links from Redis. Use a development database and mailbox for this suite.

## Deploy in production

1. Point your domain at the Docker host and make TCP ports 80 and 443 available for Caddy.
2. Copy `.env.example` to `.env`. Set `APP_URL` to the public HTTPS origin, choose a URL-safe `POSTGRES_PASSWORD`, and generate and securely retain a separate `KEY_ENCRYPTION_SECRET`. Set `RESEND_API_KEY` and `EMAIL_FROM` using a verified sender domain. Set `ADMIN_EMAILS` to the comma-separated addresses to promote at sign-up and migration startup. Leave `GEMINI_API_BASE_URL` empty for direct Gemini calls.
3. Start the stack.

```bash
docker compose --profile prod up -d --build --wait
docker compose logs --tail=50 migrate web worker backup
curl -fsS "https://your-domain.example/api/health"
```

Caddy terminates TLS and forwards the app's streaming responses. Compose binds its direct Web, Postgres, Redis and S3 ports to loopback. The web app and worker write JSON logs to stdout. When `RESEND_API_KEY` is empty, email goes to the local Redis mailbox.

Keep the named volumes across deployments. The S3 service uses LocalStack Community 4.14 with a pinned S3 persistence extension. Its data lives on the `localstack` volume, which should be included in your server backups. The `backup` service also uploads a nightly Postgres dump to `s3://backups/postgres/` and removes dumps older than 14 days. Store off-host copies of the Postgres dumps, S3 volume and encryption secret for recovery. Stopping Compose preserves volumes. `docker compose down -v` permanently removes them.

Download a dump from the backup bucket with the AWS CLI. Use the host endpoint from `S3_ENDPOINT` in your environment. Restore into an empty database with Postgres 17 client tools, then point the deployment at that restored database.

```bash
aws --endpoint-url http://localhost:14566 s3 ls s3://backups/postgres/
aws --endpoint-url http://localhost:14566 s3 cp s3://backups/postgres/<dump>.dump ./resume.dump
scripts/restore.sh 'postgres://user:password@localhost:55432/empty_database' ./resume.dump
```

The initial migration provisions a fresh database. Importing data from a previous deployment requires a separate migration of accounts, application rows and storage objects.

## Checking against real Gemini

Run the live Gemini smoke test to check the prompts, schemas and model name against Google’s API with your own key. It uses a few thousand tokens.

```bash
GEMINI_API_KEY=AIza... npm run smoke:gemini
```

Set `GEMINI_MODEL` (server env) to switch models without a code change; it defaults to `gemini-2.5-flash`.
