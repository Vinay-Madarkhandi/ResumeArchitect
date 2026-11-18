# ResumeArchitect: Competitor Landscape & Production Architecture

> **Document Context**: Comprehensive landscape analysis of individual-facing resume tailoring, career CRM, and ATS optimization platforms, combined with production architecture specifications for a self-hosted deployment of ResumeArchitect (Next.js, PostgreSQL, Redis, S3/LocalStack, Resend, BYOK Gemini AI).
> **Date**: November 2026

---

# Part A: Competitor Features for Individuals

This section analyzes the leading individual-facing platforms in the resume optimization and career management space: **Teal**, **Resume Worded**, **Rezi**, **Kickresume**, **Enhancv**, **Huntr**, and **Simplify**.

---

## 1. Teal ([tealhq.com](https://www.tealhq.com))

### Platform Overview
Teal positions itself as an end-to-end "Career Growth Platform" and personal job search CRM rather than merely a resume builder. It emphasizes organizational productivity across the entire job hunt lifecycle.

### Individual-Facing Features
* **Resume Scoring & ATS Check**: Includes a rule-based Resume Checker that assesses formatting, section hierarchy, quantifiable impact metrics, word count, and bullet point length.
* **Keyword Matching & Gap Analysis**: Matches resume text against saved job descriptions. Calculates a real-time **Match Score** and categorizes keywords into hard skills, soft skills, and role qualifications.
* **Bullet Rewriting & AI Assistance**: Inline AI tool that generates and enhances resume bullets using action verbs and impact metrics.
* **LinkedIn Review**: Offers a Chrome extension module that imports LinkedIn profiles and suggests headline and summary improvements.
* **Cover Letters**: Generates customized cover letters aligned with the user's career history and the target job description.
* **Job Tracker**: A full-featured Kanban and spreadsheet pipeline (*Bookmarked, Applying, Applied, Interviewing, Negotiating, Accepted, Archived*). Stores full job postings to protect against expired listings.
* **Job Extension / Clipper**: Chrome extension supporting **40+ job platforms** (LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday) with single-click bookmarking, automatic data extraction (salary, location, company), and on-page keyword highlighting.
* **Interview Prep**: Basic note-taking linked to specific jobs, company research links, and checklist reminders.
* **Salary & Contact Tracking**: Tracks hiring manager and recruiter contacts, interview dates, follow-up reminders, and salary benchmarking data.
* **Analytics**: Basic tracking metrics (number of jobs saved, applications submitted per week).

### What is Paid (Teal+ Tier)
* **Pricing**: ~$13/week, ~$29/month, ~$79/quarter, or ~$179/year ([Teal Pricing](https://www.tealhq.com/pricing)).
* **Paid-Only Capabilities**: Unlimited AI credits (free tier has strict one-time credits); comprehensive keyword matching showing all missing and matched keywords (free tier caps at top 5 keywords); advanced styling and formatting controls; all email and cover letter templates.

### What is Notably Better Than Jobscan
* **Unified Career Database**: Teal allows users to store every bullet point, role, and skill they have ever had in a central repository, with checkboxes to toggle items on/off for specific resume variations.
* **Full Job Application CRM**: Far superior to Jobscan's primitive application tracker; provides contact tracking, task reminders, and kanban stages.
* **Browser Clipper**: Robust web extension that automatically grabs and parses job postings directly from 40+ job sites without copy-pasting.

---

## 2. Resume Worded ([resumeworded.com](https://resumeworded.com))

### Platform Overview
Resume Worded is an automated resume and LinkedIn profile review tool designed by former recruiters. It evaluates uploaded resumes against empirical recruiter benchmarks and ATS parsing rules.

### Individual-Facing Features
* **Resume Scoring & ATS Check ("Score My Resume")**: Generates a 0–100 overall score evaluated on 30+ criteria categorized by **Impact** (quantifiable outcomes, metrics), **Brevity** (conciseness, bullet length), and **Style/Readability** (ATS headers, font consistency, dates).
* **Keyword Matching**: "Targeted Resume" tool compares an uploaded resume against a pasted job posting, calculating a match percentage and identifying missing skills.
* **Bullet Rewriting ("AutoFix")**: Line-by-line bullet inspection that flags passive voice, weak action verbs, and missing context, offering AI-generated rewrites with quantifiable templates.
* **LinkedIn Profile Review**: A dedicated LinkedIn optimizer that grades profile headlines, "About" summaries, and experience sections for recruiter search visibility.
* **Cover Letters**: None / minimal focus (primarily resume and LinkedIn).
* **Job Tracker / Clipper**: None.
* **Interview Prep / Salary / Contacts**: None (specialized audit tool).
* **Analytics**: Score progression history across multiple resume revisions.

### What is Paid (Resume Worded Pro)
* **Pricing**: ~$49/month, ~$33/month billed quarterly ($99/quarter), or ~$19/month billed annually ($229/year) ([Resume Worded Pricing](https://resumeworded.com/pro)).
* **Paid-Only Capabilities**: Detailed line-by-line feedback; unlimited resume and LinkedIn scans; AI AutoFix rewrites; full Targeted Resume keyword gap analysis; 250+ vetted sample bullet points for top tech/finance roles.

### What is Notably Better Than Jobscan
* **Recruiter-Centric Impact Rubrics**: Highly actionable, specific feedback on metric density, verb variety, and sentence structure rather than just keyword stuffing.
* **Dedicated LinkedIn Profile Auditor**: Scores LinkedIn profiles for search algorithm discoverability, which Jobscan offers only in a fragmented format.

---

## 3. Rezi ([rezi.ai](https://www.rezi.ai))

### Platform Overview
Rezi is an ATS-first resume builder designed around strict structural compliance with parsing software (Workday, Taleo, Greenhouse). It focuses on high-efficiency, clean, single-column formats.

### Individual-Facing Features
* **Resume Scoring & ATS Check ("Rezi Score")**: Real-time 0–100 score driven by a 23-point audit covering content quality, formatting, keyword optimization, and section readiness.
* **Keyword Matching**: AI Keyword Targeting scans target job descriptions and identifies missing technical skills, hard competencies, and certifications.
* **Bullet Rewriting**: AI bullet point generator and editor trained on industry standards to transform passive statements into active achievements.
* **LinkedIn Review**: Profile import functionality to generate an ATS resume draft from LinkedIn data.
* **Cover Letters & Resignation Letters**: AI-driven cover letter generator matching the resume's typography and structure, plus resignation letter generation.
* **Job Tracker**: Basic application tracking list.
* **Job Extension / Clipper**: Browser extension to clip jobs and inject keywords.
* **Interview Prep**: AI Mock Interview feature generating anticipated behavioral and technical questions based on the candidate's resume and target job.
* **Salary / Contacts / Analytics**: Basic dashboard tracking.

### What is Paid (Rezi Pro & Lifetime)
* **Pricing**: Free tier ($0 with 1 resume limit, 3 PDF downloads); Pro at $29/month; Lifetime access at $149 one-time ([Rezi Pricing](https://www.rezi.ai/pricing)).
* **Paid-Only Capabilities**: Unlimited resume creation; unlimited PDF & DOCX exports; unlimited AI generation and keyword audits; AI interview prep module.

### What is Notably Better Than Jobscan
* **Lifetime Deal Option**: A $149 one-time payment eliminates recurring monthly SaaS subscription fatigue.
* **Integrated Native ATS Document Builder**: Eliminates the round-trip friction of uploading a Word document to Jobscan, getting a score, editing in Word, and re-uploading.
* **AI Mock Interview Generator**: Dynamic generation of interview questions tailored to the exact role and candidate profile.

---

## 4. Kickresume ([kickresume.com](https://www.kickresume.com))

### Platform Overview
Kickresume pairs AI writing capabilities with designer-crafted resume templates, personal portfolio websites, and human proofreading services.

### Individual-Facing Features
* **Resume Scoring & ATS Check**: Built-in ATS resume checker evaluating keyword alignment, formatting risks, and readability.
* **Keyword Matching**: Analyzes target job listings and flags missing keywords and phrases.
* **Bullet Rewriting & AI Writer**: GPT-powered drafting of summaries, work experience bullets, and skill sections from job titles and prompt inputs.
* **LinkedIn Review**: Direct LinkedIn profile import to populate resume fields.
* **Cover Letters**: Matching AI cover letter builder styled identically to the chosen resume template.
* **Job Tracker / Clipper**: Mobile apps (iOS/Android) for tracking and editing; no heavy browser-based CRM.
* **Website & Portfolio Builder**: One-click feature converting resume data into a hosted, responsive personal website/portfolio.
* **Interview Prep**: Career Map feature suggesting progression pathways based on skill sets.
* **Salary / Contacts / Analytics**: Limited to portfolio traffic insights.

### What is Paid (Kickresume Premium)
* **Pricing**: Free tier (4 basic templates, 1 basic website); Premium at ~$24/month, ~$18/month billed quarterly ($54), or ~$8/month billed annually ($96) ([Kickresume Pricing](https://www.kickresume.com/en/pricing/)). Free for verified students/teachers (up to 180 days).
* **Paid-Only Capabilities**: 40+ premium ATS templates; unlimited AI resume and cover letter writing; full ATS checker; custom domain for personal website; DOCX exports.

### What is Notably Better Than Jobscan
* **One-Click Personal Portfolio Website**: Automatically generates a public-facing web portfolio from the resume without requiring web development knowledge.
* **Mobile Editing Apps**: Dedicated iOS and Android applications for updating resumes and generating letters on mobile devices.
* **Design & Typography Range**: Significantly higher visual aesthetic appeal and layout control compared to Jobscan’s plain text reports.

---

## 5. Enhancv ([enhancv.com](https://enhancv.com))

### Platform Overview
Enhancv focuses on visual storytelling and modern design, incorporating human-centric sections alongside standard ATS optimization.

### Individual-Facing Features
* **Resume Scoring & ATS Check**: 27-point resume content checker that audits structure, grammar, repetition, and contact information.
* **Keyword Matching**: Job description matching tool calculating match scores and surfacing missing keywords.
* **Bullet Rewriting**: AI writing assistant offering real-time suggestions to convert task descriptions into quantified achievements.
* **Distinctive Narrative Blocks**: Custom sections such as "My Time" (pie chart of daily focus), "Strengths", "Books That Influenced Me", and "Philosophy".
* **Cover Letters**: Design-matched cover letter builder sharing color schemes, typography, and header blocks with the resume.
* **Job Tracker / Extension**: Job application tracking dashboard and extension.
* **Interview Prep / Salary / Contacts**: Minimal; primary emphasis is on design and document tailoring.
* **Analytics**: Document view counts and download tracking for shared resume links.

### What is Paid (Enhancv Pro)
* **Pricing**: 7-day trial; Pro at ~$24.99–$39.00/month, ~$69 every 3 months (~$23/month), or ~$99 every 6 months (~$16.50/month) ([Enhancv Pricing](https://enhancv.com/pricing/)).
* **Paid-Only Capabilities**: Watermark removal; unlimited resumes and cover letters; full AI generation tools; complete access to ATS and creative design templates.

### What is Notably Better Than Jobscan
* **Visual & Modular Customization**: Unmatched design flexibility with drag-and-drop sections, color palettes, and font pairings while preserving ATS parsability in single-column modes.
* **Shared Web Links with View Tracking**: Provides a shareable web link for resumes with basic analytics on when recruiters view the document.

---

## 6. Huntr ([huntr.co](https://huntr.co))

### Platform Overview
Huntr started as an application tracking Kanban board and has evolved into an AI-powered job search suite combining a CRM, ATS resume builder, and browser automation.

### Individual-Facing Features
* **Job Tracker (Flagship CRM)**: Kanban board (*Wishlist, Applied, Interview, Offer, Rejected*) featuring custom tags, checklists, salary figures, and deadlines.
* **Contact & Activity Management**: Tracks recruiters, alumni, and hiring managers associated with specific applications, including email interaction logs and notes.
* **Job Extension & Application Autofill**: Chrome extension that clips postings from LinkedIn, Indeed, Greenhouse, and Lever, and **autofills job application form fields** using the stored profile.
* **Resume Scoring & ATS Check**: Resume checker inspecting impact, spelling, readability, and structural compliance.
* **Keyword Matching & AI Tailoring**: Extracts keywords from job postings, scores match density, and automatically tailors bullets, summaries, and skills to align with the role.
* **Cover Letters**: Role-specific AI cover letter generator.
* **Interview Prep**: Structured interview stage logging and note management.
* **Analytics**: Comprehensive job search funnel analytics, conversion rates between stages, and geographical map view of applications.

### What is Paid (Huntr Pro)
* **Pricing**: Free tier (up to 100 jobs on board, 2 AI-tailored resumes); Pro at ~$40/month, ~$90/quarter ($30/month), or ~$160/6-months ($26.67/month) ([Huntr Pricing](https://huntr.co/pricing)).
* **Paid-Only Capabilities**: Unlimited job tracking; unlimited AI tailoring and cover letters; advanced ATS keyword scanner; complete job application autofill; comprehensive search funnel analytics.

### What is Notably Better Than Jobscan
* **Application Form Autofill**: The browser extension directly populates repetitive form fields across popular ATS job portals.
* **Deep Career CRM & Funnel Metrics**: Calculates transition conversion rates (e.g., % of applications leading to first-round screens) and visualizes application distribution on a map.

---

## 7. Simplify ([simplify.jobs](https://simplify.jobs))

### Platform Overview
Simplify is known for browser-level application automation and autofill ("Simplify Copilot"), backed by a community-driven job discovery feed and AI tailoring.

### Individual-Facing Features
* **Simplify Copilot (Form Autofill)**: Chrome extension that automatically maps and fills personal information, work experience, education, and complex EEO/diversity questions across thousands of ATS platforms (Workday, Greenhouse, Lever, Ashby, Taleo).
* **Job Tracker with Gmail Sync**: Kanban tracker that automatically logs jobs applied for via the extension and **scans Gmail for status updates** (interview invites, rejections) to update board stages automatically.
* **Job Discovery & Matching Board**: Personalized feed of verified job postings curated by experience level, location, and visa sponsorship requirements.
* **Resume Scoring & ATS Templates**: ATS-compliant templates with keyword match suggestions against specific listings.
* **Bullet Rewriting & Tailoring (Simplify+)**: AI bullet rewrites and tailored application answers.
* **Cover Letters**: One-click AI cover letters matched to the posting.
* **Autopilot (Simplify+)**: Autonomous submission agent that applies to up to ~20 compatible listings per week on behalf of the user.
* **Analytics**: Tracks application count, response rates, and platform-wide benchmark comparisons.

### What is Paid (Simplify+)
* **Pricing**: Free tier (unlimited Copilot autofill, job tracker, Gmail sync, manual resume builder); Simplify+ at $19.99/week, $39.99/month, or $89.99/quarter ([Simplify.jobs](https://simplify.jobs)).
* **Paid-Only Capabilities**: AI resume tailoring and bullet rewriting; AI custom application question answering; Autopilot automated submissions; advanced recruiter insights.

### What is Notably Better Than Jobscan
* **Universal 1-Click ATS Form Autofill**: Saves hours of manual data entry by populating complex multi-page ATS forms with zero copy-pasting.
* **Automated Email Syncing**: Keeps application statuses accurate automatically by parsing incoming employer emails.
* **Generous Free Tier**: Offers unlimited form autofilling and job tracking at zero cost.

---

## Competitor Feature Matrix

| Feature | Jobscan | Teal | Resume Worded | Rezi | Kickresume | Enhancv | Huntr | Simplify |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ATS Keyword Scoring** | Yes (Core) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **In-App Rich Text Editor** | Partial | Yes | No | Yes | Yes | Yes | Yes | Yes |
| **Line-by-Line Diff / Redline** | No | No | No | No | No | No | No | No |
| **Visual Kanban Job Tracker** | No (List only) | Yes | No | Basic | No | Basic | Yes (Advanced) | Yes (Auto-sync) |
| **Browser Job Clipper** | Yes | Yes | No | Yes | No | Yes | Yes | Yes |
| **ATS Form Autofill** | No | No | No | No | No | No | Yes | Yes (Copilot) |
| **Gmail Status Sync** | No | No | No | No | No | No | No | Yes |
| **Central Career Database** | No | Yes | No | No | No | No | No | Yes (Profile) |
| **Personal Web Portfolio** | No | No | No | No | Yes | No | No | No |
| **AI Mock Interview Prep** | No | No | No | Yes | No | No | No | No |
| **Transparent BYOK Pricing** | No | No | No | No | No | No | No | No |

---

## Features Jobscan Lacks That Individuals Value

Jobscan remains rigid: it operates as an external scanning auditor with high subscription fees (~$49.95/month or ~$89.85/quarter), strict monthly scan limits, no unified career database, no native redline diff editor, and no modern browser automation.

| Feature Lacking in Jobscan | Competitor Reference | Acceptance Criterion for ResumeArchitect |
| :--- | :--- | :--- |
| **Granular Before/After Redline Diff** | Unique Gap | User sees exact word-level insertions and deletions with an inline explanation and per-change revert button. |
| **Central Career Database (Master History)** | Teal | User can store all past experiences and toggle specific bullets on or off per application without losing unselected text. |
| **Visual Kanban Application Pipeline** | Teal, Huntr | User can drag applications across stages (*Saved, Applied, Interviewing, Offer, Rejected*) with custom notes and interview dates. |
| **Universal Job Clipper Extension** | Teal, Simplify | Chrome extension extracts job title, company, salary, and raw JD text into the self-hosted app via authenticated REST API. |
| **Email Status Auto-Sync** | Simplify | Background worker parses connected IMAP/Gmail notifications to update application records to *Interview* or *Rejected*. |
| **Interactive AI Interview Preparation** | Rezi | System generates 5 role-specific behavioral and technical interview questions based on the tailored resume and job description. |
| **ATS Application Form Autofill** | Simplify, Huntr | Browser extension detects form fields on Greenhouse, Lever, and Workday to inject profile data in one click. |
| **One-Click Shareable Web Portfolio** | Kickresume | Generates a clean, hosted public URL (with optional password protection) displaying the candidate's verified resume. |
| **Bring-Your-Own-Key (BYOK) Model** | Unique Gap | System executes all AI prompts using the user's encrypted Gemini API key with zero subscription fees or arbitrary scan quotas. |
| **Strict Anti-Hallucination Grounding** | Unique Gap | AI is constrained by system prompts to never invent unprovided metrics, flagging unverified claims for user review. |

---

# Part B: Production Web App Architecture (Self-Hosted)

This section provides concrete, actionable best practices for deploying **ResumeArchitect** as a production-grade, self-hosted web application using **Next.js (App Router)**, **PostgreSQL**, **Redis**, **S3-compatible Object Storage (LocalStack / MinIO)**, **Resend**, and **Gemini AI (BYOK)**.

---

## 1. Authentication & Session Management (Email + Password)

Guided by **NIST SP 800-63B** (*Digital Identity Guidelines: Authentication and Lifecycle Management*) and the **OWASP Authentication & Password Storage Cheat Sheets**.

### Password Hashing
* **Algorithm**: **Argon2id** (RFC 9106), the OWASP-recommended algorithm offering hybrid resistance against both GPU side-channel attacks and memory-hard ASIC attacks.
* **Parameters (OWASP 2026 Recommended Minimums)**:
  * Memory cost ($m$): `19456` KiB (19 MiB).
  * Time cost / iterations ($t$): `2`.
  * Parallelism ($p$): `1` (or matching dedicated server CPU threads).
  * Salt length: 16 cryptographically secure random bytes generated via `crypto.randomBytes(16)`.
  * Hash output length: 32 bytes.
* **Password Policy (NIST 800-63B §5.1.1.2)**:
  * Minimum length: 8 characters (recommend 12+).
  * Maximum length: 64–128 characters (truncation prevents DoS via oversized inputs).
  * Allow all printable ASCII and Unicode characters (including spaces and emojis).
  * Do NOT enforce arbitrary composition rules (e.g., requiring uppercase, special characters, numbers), which encourage predictable substitutions.
  * Check against common password dictionaries (e.g., haveibeenpwned top 100k or zxcvbn).

### Session Cookies vs. JWT
* **Architecture Decision**: Use **Stateful Session Identifiers stored in HttpOnly cookies**, backed by **Redis** (or PostgreSQL).
* **Why Session Cookies Over Stateless JWTs**:
  * Self-hosted web apps require instant session invalidation (e.g., upon password change, account compromise, or remote logout). Stateless JWTs cannot be revoked before expiration without maintaining a blacklist in Redis, which defeats the purpose of being stateless.
  * Avoids storing tokens in `localStorage` or `sessionStorage`, eliminating exposure to Cross-Site Scripting (XSS) credential theft.
* **Session Cookie Configuration**:
  ```http
  Set-Cookie: session_id=<crypto-random-token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800;
  ```
  * `HttpOnly`: Prevents JavaScript execution from accessing the cookie (`document.cookie`).
  * `Secure`: Transmitted only over HTTPS (enforced in production).
  * `SameSite=Lax`: Balances CSRF protection with top-level link navigation. Use `SameSite=Strict` for sensitive API subpaths.
  * `Path=/`: Accessible across the entire application.

### Session Storage Pattern (Redis)
* **Token Generation**: Generate 32 bytes of cryptographically secure random data:
  ```typescript
  import crypto from 'node:crypto';
  const sessionToken = crypto.randomBytes(32).toString('hex'); // 256 bits of entropy
  ```
* **Storage Key**: Store in Redis as `session:<sessionToken>` with a TTL of 7 days:
  ```json
  {
    "userId": "usr_c8f921a4",
    "ip": "203.0.113.195",
    "userAgent": "Mozilla/5.0 ...",
    "createdAt": 1731910000,
    "lastActiveAt": 1731913600
  }
  ```
* **Sliding Expiration**: On authenticated requests, if $(TTL < 3\text{ days})$, reset the Redis key expiration back to 7 days.
* **User Session Set**: Maintain a Redis set `user_sessions:<userId>` containing all active session tokens for the user, enabling immediate multi-device inventory and global logout.

### CSRF Defense
* Next.js Server Actions and Route Handlers:
  * Verify standard headers: Ensure the `Origin` or `Referer` header matches the configured host domain on all state-changing requests (`POST`, `PUT`, `DELETE`, `PATCH`) per OWASP CSRF Prevention Cheat Sheet §Header Verification.
  * For standard API endpoints consumed by external clients or extensions, implement a custom request header check (e.g., `X-Requested-With: ResumeArchitectClient`), which browsers will not send cross-origin without CORS preflight approval.

### Email Verification & Password Reset Tokens
* **Generation**: 32 cryptographically secure random bytes (`crypto.randomBytes(32).toString('base64url')`).
* **Database Storage**: **Never store raw tokens in the database**. Hash the token using SHA-256 before saving to PostgreSQL:
  ```sql
  CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_reset_token_hash ON password_reset_tokens(token_hash);
  ```
* **Lifespans**:
  * Password Reset: 15 minutes (NIST 800-63B recommendation: max 12 hours, optimal 15–30 min).
  * Email Verification: 24 hours.
* **Single Use & Revocation**: Mark token as `used_at = now()` immediately upon redemption in a database transaction. Invalidate all active user sessions upon successful password reset.

### Rate Limiting & Account Lockout
* **NIST 800-63B §5.2.2 Guidance**: Avoid hard permanent account lockouts because they create a trivial Denial of Service (DoS) attack vector against legitimate users.
* **Implementation (Redis Sliding Window)**:
  * **By IP Address**: Limit `/api/auth/login` to 10 attempts per minute per IP.
  * **By Email/Account**: After 5 consecutive failed login attempts on a specific email address within 15 minutes, enforce an exponential delay (e.g., 2s, 4s, 8s) or require a CAPTCHA (Cloudflare Turnstile). Return an generic error message: *"Invalid email or password."*

### Optional TOTP Two-Factor Authentication (RFC 6238)
* **Parameters**: 6-digit codes, 30-second time step, HMAC-SHA1 or HMAC-SHA256.
* **Secret Storage**: Encrypt the TOTP secret key at rest in PostgreSQL using AES-256-GCM under the Server Master Key (SMK).
* **Backup Codes**: Generate 8 to 10 single-use emergency backup codes (10 characters alphanumeric). Store them hashed in the database using Argon2id or bcrypt; delete each backup code upon successful redemption.

### Account Deletion & Global Logout
* **"Sign Out of All Sessions"**:
  1. Read the user's active session set from `user_sessions:<userId>`.
  2. Issue a pipelined Redis `DEL` on each `session:<token>` key.
  3. Delete the set `user_sessions:<userId>`.
  4. Clear the local browser session cookie.
* **Account Deletion (GDPR Article 17 - Right to Erasure)**:
  * Atomic database transaction cascading deletes across all user tables (`users`, `resumes`, `tailored_jobs`, `api_keys`, `reset_tokens`).
  * Queue a background job to delete all user-owned files from S3/LocalStack (`resumes/{userId}/*`).
  * Invalidate all Redis sessions immediately.

---

## 2. Admin Panel for a Solo Operator

A single-operator self-hosted app needs operational control and security visibility without heavy enterprise SaaS dependencies.

```
+---------------------------------------------------------------------------------+
| RESUMEARCHITECT ADMIN DASHBOARD                                  [Admin: Online]|
+-----------------------+---------------------------------------------------------+
| [Users]               | Total Users: 142 | Tailored Resumes: 1,894 | Redis: OK  |
| [AI Telemetry]        | Gemini 2.5 Calls (24h): 412 | 429 Errors: 2 | Latency: 1.4s |
| [Job Queues]          | BullMQ: [Active: 1] [Waiting: 0] [Failed: 2 (Retry All)]|
| [Audit Logs]          | Feature Flags: [x] Registrations  [x] PDF  [ ] Maintenance|
| [System Config]       | Broadcast Banner: [ "Scheduled DB maintenance at 02:00" ] |
+-----------------------+---------------------------------------------------------+
```

### Core Admin Dashboard Modules
1. **User Management**:
   * Searchable table: User ID, email, verification status, registration date, last login timestamp, total resumes created.
   * Actions: Ban/unban user (sets `is_banned = true`, immediately destroys active sessions in Redis), trigger manual password reset link, force email re-verification, delete user account.
2. **Usage & AI Telemetry**:
   * Aggregate counts: Daily Active Users (DAU), tailored resumes generated, PDF exports rendered.
   * AI Error Rate Monitor: Tracks Gemini API responses:
     * HTTP 200 (Success)
     * HTTP 429 (Rate Limit / Quota Exceeded)
     * HTTP 500/503 (Model Overloaded / Upstream Outage)
   * Latency Distribution: p50, p95, p99 response times for Gemini streaming calls.
   * **Security Rule**: NEVER display raw prompts, user resumes, or decrypted API keys in telemetry. Only show tokens consumed, latency, status codes, and anonymized error strings.
3. **Job Queue Health (BullMQ)**:
   * Real-time counters: Active, Waiting, Completed, Failed, Delayed jobs.
   * Direct actions: View failed job stack traces, "Retry Job", "Retry All Failed", and "Clear Dead Letter Queue".
4. **Audit Log**:
   * Append-only table logging all privileged events:
     * Admin logins (IP, timestamp, user agent).
     * Account bans / unbans.
     * Configuration and feature flag changes.
     * Manual database cleanup actions.
5. **Feature Flags & Global Controls**:
   * Boolean toggles stored in Redis or database:
     * `allow_new_registrations`: Disable signups during maintenance.
     * `maintenance_mode`: Read-only banner across the app.
     * `enabled_ai_models`: Allow toggling between `gemini-2.5-flash`, `gemini-1.5-pro`, etc.
6. **Announcements**:
   * Configurable markdown banner message displayed globally at the top of the user app for notifications or scheduled downtime.

---

## 3. Background Job Processing (Redis + BullMQ)

Long-running operations (PDF parsing, multi-pass AI resume rewriting, ATS scoring, document export compilation) must not run inside Next.js HTTP request-response lifecycles. Use **BullMQ** running against the self-hosted Redis instance.

```mermaid
flowchart LR
    A[Next.js App Router] -->|Enqueue Job with deterministic ID| B[(Redis / BullMQ)]
    B -->|Consume Job| C[Worker Process]
    C -->|Stream AI Prompt| D[Gemini API]
    C -->|Save Artifact| E[(LocalStack S3)]
    C -->|Update Status| F[(PostgreSQL)]
    C -->|On Max Retries| G[(Dead Letter Queue / Failed)]
```

### BullMQ Architectural Patterns

#### 1. Idempotency & Deduplication
To prevent duplicate job execution if a client double-submits or an HTTP request retries, generate a deterministic `jobId`:
```typescript
import crypto from 'node:crypto';

function generateJobId(userId: string, resumeId: string, jobId: string, step: string): string {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${resumeId}:${jobId}:${step}`)
    .digest('hex');
}

await resumeQueue.add('tailor-resume', jobPayload, {
  jobId: generateJobId(user.id, resume.id, targetJob.id, 'v1'),
  removeOnComplete: { age: 3600, count: 500 }, // Auto-clean completed jobs after 1h
  removeOnFail: { age: 86400 * 7 }              // Retain failed jobs for 7 days
});
```

#### 2. Robust Retry Strategies
Network timeouts, transient Gemini 503 errors, or rate limits must not cause permanent job failure. Configure exponential backoff:
```typescript
const queueOptions = {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000 // Delays: 3s, 6s, 12s, 24s, 48s
    }
  }
};
```

#### 3. Dead Letter Queue (DLQ) & Failure Alerting
* When a job exhausts all 5 attempts, BullMQ moves it to the `failed` state.
* Attach a global failure listener on the worker:
  ```typescript
  worker.on('failed', async (job, err) => {
    logger.error({
      event: 'job_exhausted_retries',
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      data: job?.data
    });
    // Record failure in audit log and alert solo operator
  });
  ```

#### 4. Graceful Worker Shutdown
Self-hosted Docker deployments must not kill running AI pipelines on `SIGTERM`:
```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing BullMQ worker gracefully...');
  await worker.close(); // Waits for active jobs to complete or pause
  process.exit(0);
});
```

---

## 4. Object Storage with S3 API (LocalStack / MinIO)

All resume files (original uploaded PDFs, extracted text caches, generated tailored DOCX/PDF files) must reside in S3-compatible object storage rather than on the application server's local container filesystem.

### Bucket Policy & Privacy
* Buckets must remain strictly private. Set `BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, and `RestrictPublicBuckets` to `true`.
* Never route binary file uploads through the Next.js Node.js server. Use **Presigned URLs**.

### Presigned Upload Pattern (Direct-to-S3)
1. Browser requests a presigned upload URL from Next.js: `POST /api/resumes/upload-url`.
2. Server validates user authentication and generates a presigned S3 URL with strict constraints:
   ```typescript
   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

   const key = `users/${userId}/resumes/${crypto.randomUUID()}.pdf`;
   const command = new PutObjectCommand({
     Bucket: process.env.S3_BUCKET_NAME,
     Key: key,
     ContentType: 'application/pdf',
     Metadata: { owner: userId }
   });

   const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes
   ```
3. Browser performs direct HTTP `PUT` to the S3 endpoint with the binary payload.

### Size, MIME-Type, and Path Traversal Restrictions
* **Path Sandboxing**: Keys are strictly generated on the server using UUIDs under `users/{userId}/`. Never accept raw user file paths or filenames directly from client input.
* **Size Enforcement**: In the presigned policy or client upload validation, cap files to 10 MB.
* **Server-Side Magic Byte Validation**: When the BullMQ background worker ingests the uploaded file from S3 for text parsing, it reads the initial 4 bytes to verify file magic headers:
  * PDF: `%PDF` (`0x25 0x50 0x44 0x46`)
  * DOCX: `PK..` (`0x50 0x4B 0x03 0x04`)
  * Reject and delete any file whose magic bytes do not match the declared MIME type.

### Optional Virus Scanning (ClamAV Container)
* In the `docker-compose.yml`, run a `clamav/clamav` service.
* Upon upload completion, the BullMQ worker passes the S3 object stream through ClamAV via `clamd` TCP daemon (port 3310) using `INSTREAM`. If infected, delete immediately and notify user.

---

## 5. Secure Storage of Users' AI API Keys (BYOK Envelope Encryption)

Because ResumeArchitect allows users to supply their own Gemini API keys, **a breach of the database must not compromise users' API credentials**.

### Threat Model
* **Threat 1**: Accidental SQL injection or public database backup exposure.
* **Threat 2**: Logging credentials in console output, error trackers, or HTTP access logs.
* **Threat 3**: Malicious insider or compromised read-only DB replica.

### Cryptographic Architecture: Envelope Encryption (AES-256-GCM)

```
                    +------------------------------------+
                    | Server Master Key (SMK)            |
                    | 256-bit Key from ENV / Secret File |
                    +-----------------+------------------+
                                      |
                     AES-256-GCM      | (Decrypt on call)
                                      v
+------------------+         +------------------+         +--------------------+
| User API Key     | ------> | Ciphertext       | ------> | PostgreSQL         |
| "AIzaSy..."      |         | + 12-byte IV     |         | `user_api_keys`    |
| (Plaintext)      |         | + 16-byte Tag    |         | (Encrypted at rest)|
+------------------+         +------------------+         +--------------------+
```

* **Server Master Key (SMK)**: A 32-byte (256-bit) cryptographically random key stored in an environment variable `MASTER_ENCRYPTION_KEY` (or mounted from a Docker secret file). Never committed to Git.
* **Encryption Standard**: **AES-256-GCM** (Galois/Counter Mode), providing both confidentiality and authenticated integrity.

### Implementation Specification
```typescript
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag

export function encryptApiKey(plainKey: string, masterKeyHex: string): { ciphertext: string; iv: string; tag: string } {
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
  
  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag
  };
}

export function decryptApiKey(encryptedData: { ciphertext: string; iv: string; tag: string }, masterKeyHex: string): string {
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const tag = Buffer.from(encryptedData.tag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Strict Key Lifecycle Rules
1. **Never Cache in Redis**: Keep decrypted keys strictly in ephemeral memory for the duration of the outgoing Gemini HTTP request.
2. **Never Return to Frontend**: The client can check `has_configured_key: true` or view the last 4 characters (`...Ab3D`), but the full key is never sent over any API response.
3. **Log Sanitization**: Configure logging libraries (e.g., Pino) to automatically redact `apiKey`, `key`, `Authorization`, and regex matches for `AIza[0-9A-Za-z-_]{35}`.

---

## 6. Transactional Email via Resend

Resend provides a clean developer API for transactional emails (verification links, password resets, security alerts) that can be easily self-hosted.

### Core Email Triggers
* **Account Verification**: Sent on signup with verification link (`/auth/verify?token=...`).
* **Password Reset Request**: Sent with short-lived 15-minute token link.
* **Security Notifications**: Sent immediately when:
  * Password is changed.
  * Account email is changed.
  * Gemini API key is updated or removed.
  * New login detected from an unfamiliar IP/device.

### Deliverability & DNS Authentication
Self-hosted transactional emails will land in spam without proper domain reputation configuration. Set up the following DNS records on your domain registrar:
* **SPF (Sender Policy Framework)**:
  `v=spf1 include:amazonses.com ~all` (or Resend's provided include record).
* **DKIM (DomainKeys Identified Mail)**:
  Publish the three 2048-bit CNAME public keys provided by Resend to cryptographically sign outgoing message headers.
* **DMARC (Domain-based Message Authentication, Reporting, and Conformance)**:
  Publish a TXT record at `_dmarc.yourdomain.com`:
  ```txt
  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com; pct=100; adkim=r; aspf=r
  ```
  Move from `p=none` (monitoring) to `p=quarantine` or `p=reject` once DKIM and SPF alignment are confirmed.
* **HTML/Plain-Text Multi-Part**: Always send multi-part emails containing both clean HTML (using `@react-email/components`) and a fallback plain-text rendering to maximize deliverability.

---

## 7. Operational Infrastructure: Backups, Migrations, Observability & GDPR

### Automated Database Backups (pg_dump)
* Run a lightweight backup sidecar container in `docker-compose.yml` or a host systemd cron job executing `pg_dump`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_DIR="/backups/postgres"
  FILENAME="${BACKUP_DIR}/resumearchitect_${TIMESTAMP}.dump"

  # Dump in custom format with maximum compression
  pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -Z 9 -f "$FILENAME"

  # Retain last 7 daily, 4 weekly backups; delete older
  find "$BACKUP_DIR" -type f -name "*.dump" -mtime +28 -delete
  ```
* **Offsite Sync**: Copy the compressed dump file to an offsite S3 bucket or remote rsync target daily.

### Database Migrations
* Use declarative, code-controlled migrations (**Prisma Migrate** or **Drizzle Kit**).
* **Execution Pattern**: Run migrations inside an ephemeral Docker init container or pre-start script before launching the Next.js web application containers:
  ```bash
  # Pre-start migration command
  npx prisma migrate deploy
  ```
* **Zero-Downtime Rule**: Follow expand/contract schema practices (add nullable columns first, deploy code, populate data, add constraints, drop deprecated columns in a subsequent release).

### Health Checks & Readiness Probes
Configure dual health check endpoints in Next.js:
1. **Liveness Probe** (`/api/health/liveness`):
   * Returns HTTP 200 `{ status: "alive" }` if the Next.js process is executing. Used by Docker Compose to restart crashed containers.
2. **Readiness Probe** (`/api/health/readiness`):
   * Executes deep dependency checks:
     * PostgreSQL: `SELECT 1;`
     * Redis: `redis.ping() === "PONG"`
     * S3: `HeadBucketCommand`
   * Returns HTTP 200 if all pass; returns HTTP 503 Service Unavailable if any dependency fails, preventing reverse proxies (Traefik, Nginx, Caddy) from routing traffic to an unready node.

### Observability & Logging
* **Structured JSON Logging**: Use **Pino** to output structured JSON logs to `stdout`:
  ```json
  {"level":30,"time":1731910000000,"pid":1,"reqId":"req-4a8b","msg":"Tailoring resume completed","userId":"usr_123","durationMs":1420}
  ```
* **Log Aggregation**: Aggregate Docker container stdout logs using Vector, Promtail, or Fluentbit into a local Grafana Loki or simple log rotation system.
* **Error Tracking**: Self-hosted **GlitchTip** or **Sentry** instance capturing unhandled frontend and backend exceptions with source map support.

### GDPR Compliance: Data Export & Account Erasure
* **Data Portability (GDPR Art. 20)**:
  * Provide a *"Download My Data"* button in User Settings.
  * Asynchronously compiles a ZIP archive containing:
    * `profile.json` (account details, preferences).
    * `resumes.json` (all past resumes, raw text, and tailored versions).
    * `applications.json` (all job postings, match scores, diff records, notes).
    * Original uploaded PDF/DOCX files.
* **Right to Erasure (GDPR Art. 17)**:
  * Dedicated *"Delete Account"* flow requiring password re-entry.
  * Executed in a single database transaction cascading to all associated records.
  * Dispatches an immediate cleanup task removing all files in `users/{userId}/` on S3/LocalStack.

---

## 8. Reference Architecture: Docker Compose Deployment

A complete production `docker-compose.yml` for self-hosting ResumeArchitect on a single virtual private server (VPS).

```yaml
version: '3.8'

services:
  # Caddy Reverse Proxy with Automatic HTTPS
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

  # Next.js Application Server
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://localstack:4566
      - S3_BUCKET_NAME=resumearchitect-data
      - S3_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=mock-access-key
      - AWS_SECRET_ACCESS_KEY=mock-secret-key
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY} # 32-byte hex key
      - RESEND_API_KEY=${RESEND_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # BullMQ Background Worker
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://localstack:4566
      - S3_BUCKET_NAME=resumearchitect-data
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-resumearchitect}
      POSTGRES_USER: ${POSTGRES_USER:-architect}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-architect} -d ${POSTGRES_DB:-resumearchitect}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache & Queue Store
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # S3-Compatible Storage via LocalStack
  localstack:
    image: localstack/localstack:latest
    restart: unless-stopped
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3
      - DEFAULT_REGION=us-east-1
    volumes:
      - localstack_data:/var/lib/localstack
      - ./scripts/init-s3.sh:/etc/localstack/init/ready.d/init-s3.sh:ro

volumes:
  caddy_data:
  caddy_config:
  postgres_data:
  redis_data:
  localstack_data:
```

---

## 9. Citations & Authoritative References

1. **OWASP Password Storage Cheat Sheet**:
   https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
2. **OWASP Authentication Cheat Sheet**:
   https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
3. **OWASP Cross-Site Request Forgery (CSRF) Prevention Cheat Sheet**:
   https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
4. **OWASP Application Security Verification Standard (ASVS 4.0.3)**:
   https://owasp.org/www-project-application-security-verification-standard/
5. **NIST Special Publication 800-63B: Digital Identity Guidelines - Authentication and Lifecycle Management**:
   https://pages.nist.gov/800-63-3/sp800-63b.html
6. **RFC 9106: Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications**:
   https://datatracker.ietf.org/doc/html/rfc9106
7. **RFC 6238: TOTP: Time-Based One-Time Password Algorithm**:
   https://datatracker.ietf.org/doc/html/rfc6238
8. **BullMQ Documentation (Patterns, Queues, Workers, Retries)**:
   https://docs.bullmq.io/
9. **Resend Email Deliverability & DNS Best Practices (SPF/DKIM/DMARC)**:
   https://resend.com/docs/dashboard/domains/introduction
10. **Competitor References**:
    - Teal HQ: https://www.tealhq.com / https://www.tealhq.com/pricing
    - Resume Worded: https://resumeworded.com / https://resumeworded.com/pro
    - Rezi AI: https://www.rezi.ai / https://www.rezi.ai/pricing
    - Kickresume: https://www.kickresume.com / https://www.kickresume.com/en/pricing/
    - Enhancv: https://enhancv.com / https://enhancv.com/pricing/
    - Huntr: https://huntr.co / https://huntr.co/pricing
    - Simplify Jobs: https://simplify.jobs
