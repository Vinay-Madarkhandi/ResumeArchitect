# Product

<!-- impeccable:product-schema 1 -->

> Source: the owner's brief (2026-11-17) plus repository evidence. The owner approved
> the recommendations in that conversation instead of a separate interview; facts
> marked *(inferred)* come from the codebase or from those recommendations.

## Platform

web

## Users

Job seekers applying to specific roles who want each application's resume aimed at
that job description without having to rewrite it by hand. They arrive with an
existing resume (PDF/DOCX or pasted text) and a job posting copied from a job board.
*(inferred)* They do this repeatedly, one session per application, often late in the
evening after browsing listings, and on laptops more than phones.

## Product Purpose

ResumeArchitect tailors a resume to a job description using the user's own Gemini
API key. The AI reads the job, finds the gaps, rewrites the resume to fit, and checks
its own output. The user can then see exactly what changed and why, how the match
score moved, edit the result in place, and download it.

Success: the user trusts the tailored resume enough to submit it, because every
change is visible, explained, reversible, and grounded in their real experience.

## Positioning

Bring-your-own-key: the user's Gemini key is encrypted at rest and is never sent
back to the browser. Tailoring is transparent: before/after scores with an
explained breakdown, a word-level redline of every change, a reason for each
change, and per-change revert. The AI is instructed never to invent experience,
and claims it can't trace to the source resume are flagged for the user to verify.

## Operating Context

- Inputs: a master resume (PDF, DOCX, or pasted text) and a pasted job description.
- Each tailoring run produces its own application record: a snapshot of the original,
  the job description, the AI's analysis, the tailored resume, and its scores.
- Outputs: PDF and DOCX downloads, plus copy as plain text.
- Accounts and history are stored in Supabase (auth + Postgres + Storage, with
  owner-only row-level security).

## Capabilities and Constraints

- Gemini model `gemini-3.5-flash-lite` via `@google/genai`, using the user's key.
- Next.js 16 App Router, React 19, Tailwind v4, TipTap editor, `@react-pdf/renderer`.
- Serverless request limits mean that long AI runs must stream their progress.
- The resume document is a constrained rich-text model: headings, paragraphs, lists,
  bold/italic/links.

## Brand Commitments

- Name: **ResumeArchitect**.
- The owner asked for a premium palette that is easy on the eyes. They approved a
  dark-first theme with a light-theme toggle. *(inferred from approved recommendation:
  deep graphite with a soft champagne accent, low glare)*

## Evidence on Hand

No testimonials, customer logos, usage numbers, or press. Never fabricate any of
them. Example resumes and job posts shown in marketing must be labeled as examples.

## Product Principles

1. Show, don't summarize: every AI change is visible as a diff, with its reason.
2. The user's truth wins: the AI never invents experience; anything unverifiable
   is flagged; every change can be reverted.
3. Numbers explain themselves: every score comes with the breakdown that produced it.
4. Calm under long work: AI steps report live progress and recover from failure.
5. What you see is what you download: exports always come from the on-screen state.

## Accessibility & Inclusion

WCAG 2.2 AA contrast in both themes, full keyboard operation, reduced-motion support,
and no meaning carried by color alone in the diff (insertions and deletions also use
underline and strikethrough).
