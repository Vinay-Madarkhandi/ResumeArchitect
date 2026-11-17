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

Requirements: Node 22, Docker (for local Supabase).

```bash
npm install
npx supabase start            # local Postgres/Auth/Storage, applies supabase/migrations
cp .env.example .env.local    # fill in the values printed by `supabase start`
openssl rand -base64 32       # → GEMINI_KEY_ENCRYPTION_SECRET
npm run dev
```

Create an account, then paste a key from [Google AI Studio](https://aistudio.google.com/app/apikey) when asked.

## Tests

```bash
npm run typecheck
npm run lint
npm test            # unit tests (diff, revert, scoring, pipeline, DOCX, import helpers)
npm run test:e2e    # Playwright, against local Supabase + a fake Gemini server
```

The end-to-end suite starts `e2e/fake-gemini.mjs` and runs the app with `GEMINI_API_BASE_URL=http://127.0.0.1:4010`, so the full pipeline runs without a Google key. Install the browser once with `npx playwright install chromium`.

## Deploying

- Apply `supabase/migrations/` to your project (`npx supabase db push`).
- Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `GEMINI_KEY_ENCRYPTION_SECRET`. Leave `GEMINI_API_BASE_URL` unset.
- `/api/tailoring` streams for up to 300 seconds (`maxDuration`). On Vercel this needs Fluid compute or a plan that allows it.
