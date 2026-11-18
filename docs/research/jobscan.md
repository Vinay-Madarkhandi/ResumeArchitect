# Jobscan.co — Comprehensive Feature Research

> **Purpose:** Catalogue every individual-job-seeker feature Jobscan offers so ResumeArchitect can rebuild the product as a free, self-hosted, bring-your-own-AI-key alternative.
>
> **Research date:** 2026-11-18
>
> **Evidence standard:** Every factual claim cites at least one URL. Claims marked *[inference]* are deduced from multiple sources but not explicitly confirmed by Jobscan. Direct pages at jobscan.co returned HTTP 403 for automated fetch; facts are sourced from web-search results, cached pages, support articles, blog posts, and third-party reviews.

---

## Table of Contents

1. [Pricing & Plans](#1-pricing--plans)
2. [Resume Scanner / Match Rate](#2-resume-scanner--match-rate)
3. [Match Report (detailed breakdown)](#3-match-report-detailed-breakdown)
4. [One-Click Optimize](#4-one-click-optimize)
5. [Power Edit](#5-power-edit)
6. [Resume Builder & Templates](#6-resume-builder--templates)
7. [Cover Letter Scanner / Generator](#7-cover-letter-scanner--generator)
8. [LinkedIn Optimization](#8-linkedin-optimization)
9. [ATS Identification](#9-ats-identification)
10. [Predicted Skills](#10-predicted-skills)
11. [Job Tracker](#11-job-tracker)
12. [Job Search / Job Board](#12-job-search--job-board)
13. [Chrome Extension](#13-chrome-extension)
14. [Interview Preparation](#14-interview-preparation)
15. [How the Match Rate Works](#15-how-the-match-rate-works)
16. [Account & Platform Features](#16-account--platform-features)
17. [Out of Scope for Us](#17-out-of-scope-for-us)
18. [Build List](#18-build-list)

---

## 1. Pricing & Plans

| Tier | Price | Billing |
|------|-------|---------|
| **Free** | $0 | — |
| **Premium (Monthly)** | ~$49.95/mo | Billed monthly |
| **Premium (Quarterly)** | ~$89.95/qtr (~$29.98/mo) | Billed every 3 months |
| **Premium (Annual)** | ~$149.95/yr (~$12.50/mo) | Billed annually |

### Free tier limits

- ~5 resume scans per month.
- Basic match-rate score with limited detail.
- Limited hard-skills and soft-skills breakdown (less granular than Premium).
- No Power Edit, LinkedIn Optimization, Cover Letter tools, or Predicted Skills.
- Basic resume templates only.
- Basic Job Tracker functionality.

### Premium tier unlocks

- Unlimited resume scans.
- Full Match Report with all sections.
- Power Edit (live scoring while editing).
- One-Click Optimize (AI rewrite).
- Cover Letter Scanner & AI Generator.
- LinkedIn profile optimization.
- Predicted Skills.
- All ATS-friendly resume templates.
- Full Job Tracker.
- ATS identification.

> **Sources:** https://www.jobscan.co/pricing (via search cache); multiple review sites (TechRadar, Forbes, The Muse) reporting consistent pricing circa 2024-2025. Jobscan has historically adjusted pricing; exact current figures may differ.

---

## 2. Resume Scanner / Match Rate

### Description

The core product. The user pastes (or uploads) their resume and a target job description. Jobscan compares them and returns an overall **match-rate percentage (0–100%)**, plus a detailed breakdown by category. Jobscan recommends targeting **≥75–80% match rate** before submitting an application.

### Inputs

- Resume text (paste or upload .docx/.pdf).
- Job description text (paste).

### Outputs

- Overall match-rate percentage.
- Match Report (see §3 for every section).
- Per-keyword status (found / missing / frequency).

### Free vs Paid

| Aspect | Free | Premium |
|--------|------|---------|
| Scans per month | ~5 | Unlimited |
| Match rate score | ✅ | ✅ |
| Hard-skills list | Basic | Full with frequency & predicted importance |
| Soft-skills list | Basic | Full |
| Searchability checks | ✅ | ✅ |
| Formatting checks | ✅ | ✅ |
| Recruiter tips | Limited | Full |
| Predicted Skills | ❌ | ✅ |

### Third-party dependency

None — this is pure text-vs-text analysis. **Fully replicable with a local LLM/Gemini call.**

> **Sources:** https://www.jobscan.co/features (search cache); https://www.jobscan.co/support/match-report (search cache); https://www.jobscan.co/blog/how-scoring-works (search cache).

---

## 3. Match Report (detailed breakdown)

The Match Report is the output of a resume scan. It contains four major sections, each with sub-checks. Below is every identified section and sub-check.

### 3.1 Hard Skills

| Sub-check | What it tests | Display |
|-----------|--------------|---------|
| Keyword list | Extracts technical/industry-specific skills from the JD (e.g. "Python", "data analysis", "project management"). | List of keywords, each marked **found** ✅ or **missing** ❌ |
| Frequency | How many times each keyword appears in JD vs resume. | Count comparison (e.g. JD×3 / Resume×1) |
| Predicted importance | Each keyword is tagged high/medium/low based on where it appears in the JD (title, requirements section, repeated mentions). | Importance badge per keyword |
| Synonym detection | Recognises common synonyms/abbreviations (e.g. "JS" ↔ "JavaScript", "ML" ↔ "Machine Learning"). | Green checkmark for exact match; partial-fill indicator for synonym match |

Hard skills carry **the highest weight** in the overall score (~40–50% *[inference from Reddit reverse-engineering and blog descriptions]*).

### 3.2 Soft Skills

| Sub-check | What it tests | Display |
|-----------|--------------|---------|
| Keyword list | Interpersonal / transferable skills from JD (e.g. "communication", "leadership", "teamwork"). | Found ✅ / Missing ❌ list |
| Presence check | Whether the resume contains each identified soft skill. | Binary |

Soft skills are weighted **~10–15%** of the total score *[inference]*. Less critical for ATS but important for recruiter review.

### 3.3 Searchability

These checks evaluate whether ATS can correctly **parse and find** key information.

| Sub-check | What it tests | Scoring / Display |
|-----------|--------------|-------------------|
| **Contact information** | Name, phone, email, LinkedIn URL present and in the document body (not in headers/footers). | ✅ / ❌ per item |
| **Summary / Objective** | Whether a professional summary section exists near the top. | ✅ / ❌ |
| **Section headings** | Whether headings use standard ATS-recognised labels ("Work Experience", "Education", "Skills") vs creative labels ("Where I've Been"). | ✅ / ⚠️ with suggestion |
| **Date formatting** | Consistency and ATS-readability of dates (e.g. "Month YYYY" or "MM/YYYY" preferred). | ✅ / ⚠️ |
| **Education match** | Degree level and field vs JD requirements. | ✅ / ❌ |
| **Job title match** | Whether the resume's listed titles align with the target role title. | ✅ / ❌ with suggestion |
| **File type** | Whether the uploaded file is .docx (preferred) or a compatible PDF. Flags .jpg, .png, .pages, .odt. | ✅ / ⚠️ |

### 3.4 Formatting

These checks flag **ATS-unfriendly formatting** that may prevent correct parsing.

| Sub-check | What it tests | Scoring / Display |
|-----------|--------------|-------------------|
| **Tables** | Tables can break ATS parsing; flags their presence. | ❌ if detected |
| **Headers & footers** | Content in headers/footers is skipped by many ATS. | ❌ if critical info detected there |
| **Graphics / images** | Logos, photos, icons, charts — unreadable by ATS. | ❌ if detected |
| **Special characters** | Non-standard bullet points, symbols that may not parse. | ⚠️ with alternatives |
| **Columns** | Multi-column layouts can cause text to be read out of order. | ❌ if detected |
| **Text boxes** | Floating text boxes are often skipped. | ❌ if detected |
| **Font** | Non-standard or decorative fonts flagged. | ⚠️ |
| **Section heading names** | Also checked here for formatting-level issues (overlaps with Searchability). | ⚠️ |

### 3.5 Recruiter Tips

Additional heuristic checks based on recruiter preferences:

| Sub-check | What it tests | Display |
|-----------|--------------|---------|
| **Measurable results** | Whether the resume contains quantified achievements (numbers, percentages, metrics). | ✅ / ❌ |
| **Word count** | Whether resume length is appropriate for career level (entry: 400-600, mid: 600-800, senior: 800-1000+). | Numerical with suggestion |
| **Words to avoid** | Flags overused buzzwords/clichés: "team player", "hard worker", "detail-oriented", "go-getter", "synergy", "responsible for". | List of flagged words with alternatives |
| **Web presence** | Whether resume includes LinkedIn URL, portfolio, GitHub, etc. | ✅ / ❌ |
| **Job level match** | Whether the seniority level of the resume matches the target role (entry / mid / senior / executive). | ✅ / ⚠️ with explanation |

> **Sources:** https://www.jobscan.co/support/match-report; https://www.jobscan.co/blog/understanding-match-report; https://www.jobscan.co/blog/how-scoring-works; https://www.jobscan.co/blog/ats-resume-formatting; Reddit r/resumes discussions (all via search cache). Specific sub-checks under "Recruiter Tips" sourced from https://www.jobscan.co/resume-writing-guide (search cache) and multiple blog posts.

---

## 4. One-Click Optimize

### Description

An AI-powered feature that **automatically rewrites and tailors** the user's resume to match a specific job description. Instead of manually adding keywords, the user clicks a single button and the AI adjusts skills, bullet points, experience descriptions, and keyword placement while attempting to maintain the user's authentic voice.

### User flow

1. Upload/paste resume.
2. Paste job description.
3. Run initial scan to see baseline match rate.
4. Click "One-Click Optimize".
5. AI rewrites bullet points, injects missing keywords, adjusts phrasing.
6. User reviews the AI-generated changes.
7. Export optimised resume.

### Output

- Fully rewritten resume text optimised for the target JD.
- Updated match rate (users report jumps from ~40% to 80%+).

### Free vs Paid

Premium only.

### Third-party dependency

Jobscan uses GPT-based AI internally. **Our substitute:** Gemini API (user's own key) for the same generative rewriting. Fully replicable.

> **Sources:** https://www.jobscan.co/blog/one-click-optimize (search cache); TechRadar Jobscan review 2024; Forbes Jobscan review; Reddit r/jobs discussions.

---

## 5. Power Edit

### Description

An in-browser resume editor that shows the **match rate updating in real time** as the user types. The job description is displayed side-by-side, and missing keywords are highlighted so the user can strategically add them.

### User flow

1. Upload/paste resume + JD → initial scan.
2. Click "Power Edit" to open the editing interface.
3. Edit resume text directly in-browser.
4. Match rate and keyword indicators update live with each keystroke/change.
5. Export when satisfied (target ≥80%).

### What it tracks live

- Hard skills match count.
- Soft skills match count.
- Job title match.
- Education match.
- Word count & formatting.
- Other keywords / industry terms.

### Free vs Paid

Premium only (some sources suggest very limited free access within scan limits).

### Third-party dependency

None for the editor itself. The scoring engine is Jobscan's proprietary algorithm. **Our substitute:** Client-side scoring logic + Gemini for NLP-heavy analysis. The real-time update is a UI/engineering challenge, not a data-source problem.

> **Sources:** https://www.jobscan.co (search cache); Jobscan Help Center; YouTube tutorials; user reviews.

---

## 6. Resume Builder & Templates

### Description

A form-based resume builder that outputs ATS-friendly documents. Includes ~4–8 professionally designed templates (Classic, Modern, Executive, Streamlined). All templates use single-column layouts, standard fonts, standard section headings, and avoid ATS-breaking elements.

### Template characteristics

- Single-column layout.
- ATS-safe fonts (Arial, Calibri, Garamond, Times New Roman).
- Standard section headings (Work Experience, Education, Skills).
- No headers/footers for content, no text boxes, no embedded images.
- Standard bullet characters.
- Consistent date formatting.

### Output formats

PDF and DOCX export.

### Free vs Paid

| Aspect | Free | Premium |
|--------|------|---------|
| Templates available | Limited (1-2 basic) | All (~4-8) |
| Builder access | ✅ | ✅ |
| Export | ✅ | ✅ |

### Third-party dependency

None. **Fully replicable** with HTML/CSS templates → PDF/DOCX generation (e.g. Puppeteer for PDF, docx.js for Word).

> **Sources:** https://www.jobscan.co/resume-builder; https://www.jobscan.co/resume-templates (search cache); The Balance Money review.

---

## 7. Cover Letter Scanner / Generator

### Description

Two related tools:

**Cover Letter Scanner:** Scans a user-written cover letter against a JD, identifying missing keywords and skills — similar to the resume scanner but tuned for cover-letter conventions.

**AI Cover Letter Generator:** Generates a tailored cover letter from scratch using the user's resume + a job description as inputs.

### Scanner output

- Keyword matching (hard skills, soft skills).
- Missing competencies list.
- Tone and formatting suggestions.

### Generator flow

1. Upload/input resume or work history.
2. Paste job description.
3. AI generates a customised cover letter aligned with ATS requirements.
4. User reviews match rate and edits.
5. Export as PDF or DOCX.

### Free vs Paid

Premium only for both tools.

### Third-party dependency

Jobscan uses GPT-based AI for generation. **Our substitute:** Gemini API (user's key). The scanning/matching component is purely algorithmic. Fully replicable.

> **Sources:** https://www.jobscan.co/cover-letter; https://www.jobscan.co/blog/ai-cover-letter-generator (search cache); The Muse review.

---

## 8. LinkedIn Optimization

### Description

Scans the user's LinkedIn profile text (pasted or entered) and provides recommendations to improve recruiter-search visibility. Compares profile content against target job descriptions.

### Checks performed

| Check | Description |
|-------|-------------|
| **Headline optimisation** | Suggests keyword-rich headlines. |
| **Summary / About section** | Recommends keywords and phrasing improvements. |
| **Skills section review** | Compares listed skills to in-demand job keywords. |
| **Profile completeness** | Rates how well the profile is filled out. |
| **Recruiter search alignment** | Predicts how well the profile would appear in LinkedIn recruiter searches. |
| **JD comparison** | Matches the LinkedIn profile against a specific target role. |

### Inputs

User pastes their LinkedIn profile text (headline, summary, experience, skills) + a target JD.

### Free vs Paid

Premium only.

### Third-party dependency

**Does NOT use LinkedIn API.** Users voluntarily paste their own profile text. **Fully replicable** — it's essentially the same matching engine applied to LinkedIn-formatted text.

> **Sources:** https://www.jobscan.co/linkedin-optimization (search cache); Reddit r/jobs discussions; The Muse review.

---

## 9. ATS Identification

### Description

Given a job listing URL, Jobscan identifies **which Applicant Tracking System** the employer uses (e.g. Taleo, Workday, Greenhouse, Lever, iCIMS). It then provides ATS-specific formatting tips (e.g. whether that ATS can read tables, preferred file format, known parsing quirks).

### How it works

1. User pastes a job listing URL.
2. Jobscan analyses the URL structure and cross-references it with a database of known ATS platforms.
3. Returns the ATS name + system-specific tips.

### ATS systems detected (100+)

Workday, Taleo (Oracle), Greenhouse, Lever, iCIMS, BrassRing (Kenexa), SmartRecruiters, ADP, Jobvite, Bullhorn, SAP SuccessFactors, CATS, JazzHR, BambooHR, and many more.

### Free vs Paid

Available on free tier (within scan limits) and Premium.

### Third-party dependency

**Requires a maintained database of ATS URL patterns.** This is a proprietary dataset Jobscan maintains. **Our substitute:** Build a community-maintained mapping of URL patterns → ATS names. The URL-pattern approach is straightforward (e.g. `*.myworkdayjobs.com` = Workday, `boards.greenhouse.io/*` = Greenhouse). The ATS-specific tips can be a static knowledge base. This is feasible without partnerships.

> **Sources:** https://www.jobscan.co/applicant-tracking-systems; https://www.jobscan.co/blog/how-to-find-which-ats-company-uses (search cache); Reddit r/jobs.

---

## 10. Predicted Skills

### Description

Uses machine learning trained on thousands of job postings to suggest skills that are **likely relevant to the role but not explicitly mentioned** in the JD. Helps users fill gaps in poorly-written or vague job descriptions.

### How it works

1. User scans resume vs JD.
2. Jobscan identifies explicitly listed hard/soft skills.
3. The algorithm cross-references against similar job postings in its database.
4. Returns "predicted skills" — skills commonly associated with that role type.

### Display

Predicted skills are shown in a separate section from confirmed hard/soft skills, labelled as suggestions. They carry **less weight** in the match rate than explicitly listed skills.

### Free vs Paid

Premium only.

### Third-party dependency

Requires a large corpus of job postings for training. **Our substitute:** Gemini can predict related skills from a JD using its training data. Alternatively, build a skills taxonomy from public datasets (O*NET, ESCO). Feasible without partnerships.

> **Sources:** https://www.jobscan.co/features (search cache); https://www.jobscan.co/blog/predicted-skills (search cache); https://www.jobscan.co/support (search cache); Reddit r/resumes.

---

## 11. Job Tracker

### Description

A kanban-style application tracker for organising the job search. Replaces spreadsheets with a visual pipeline.

### Features

| Feature | Description |
|---------|-------------|
| **Kanban board** | Columns: Wishlist → Applied → Interview → Offer → Rejected (customisable). |
| **Job card details** | Company, title, salary, location, URL, full JD text. |
| **Activity logging** | Log emails sent, interviews scheduled, follow-ups. |
| **Notes & contacts** | Attach notes and recruiter contact info per job. |
| **Resume match integration** | Scan saved JD against resume directly from tracker. |
| **Date tracking** | Application date, follow-up dates, interview dates. |
| **Dashboard metrics** | Statistics about job search progress. |
| **Export** | Export job list to CSV. |
| **Cross-device sync** | Syncs via Jobscan account. |

### Free vs Paid

Basic tracking on free tier; full features on Premium.

### Third-party dependency

None. **Fully replicable** as a standard CRUD feature with local storage or database.

> **Sources:** https://www.jobscan.co/job-tracker; Chrome Web Store listing; https://www.jobscan.co/blog/job-tracker (search cache).

---

## 12. Job Search / Job Board

### Description

An integrated job search that aggregates listings from multiple sources, allowing users to discover and search for opportunities within the Jobscan platform.

### How it works

Jobscan pulls listings from **licensed partner data feeds** and job data aggregators (e.g. Appcast, Joveo, Broadbean, Indeed Publisher Program XML feeds). It does **not** scrape LinkedIn or Indeed directly.

### Free vs Paid

Available on both tiers.

### Third-party dependency

**Yes — requires licensed job-feed partnerships.** LinkedIn prohibits scraping (legal precedent: *hiQ Labs v. LinkedIn*). Indeed requires Publisher Program approval. **Our substitute for self-hosted:**

- Let users paste/import JDs manually (already the core flow).
- Provide a browser extension that extracts JDs from whatever job board the user is browsing (no scraping needed — user-initiated).
- Optionally integrate with public APIs (e.g. Adzuna, The Muse, USAJobs) that offer free tiers.
- **Recommendation:** Deprioritise building a job board; focus on the import-from-browser flow.

> **Sources:** https://www.jobscan.co/job-search (search cache); https://support.jobscan.co (search cache); Reddit r/jobs; Indeed/LinkedIn terms of service.

---

## 13. Chrome Extension

### Description

A browser extension (Chrome/Chromium) that integrates Jobscan's core features into the user's job-browsing workflow.

### Features

| Feature | Description |
|---------|-------------|
| **One-click job saving** | Save a job listing from supported boards (LinkedIn, Indeed, Glassdoor, ZipRecruiter, etc.) to Job Tracker. |
| **Auto-extract JD** | Automatically detects and extracts the full job description text from the current page. |
| **In-browser resume scan** | Run a match comparison against the extracted JD without leaving the page. |
| **Missing keyword alerts** | Real-time display of missing hard/soft skills and keywords. |
| **Multiple resume support** | Choose which resume to scan against each listing. |
| **Contact tracking** | Save recruiter/hiring manager info alongside jobs. |

### Supported job boards

LinkedIn, Indeed, Glassdoor, ZipRecruiter, CareerBuilder, Dice, and others.

### Free vs Paid

The extension itself is free; feature depth depends on account tier.

### Third-party dependency

The extension reads page DOM from job boards the user is visiting. This is **user-initiated content extraction** (not scraping), so no partnership needed. **Fully replicable** as a browser extension. The JD extraction requires per-site DOM selectors that must be maintained.

> **Sources:** Chrome Web Store (Jobscan Job Tracker listing); https://www.jobscan.co/chrome-extension (search cache); https://www.jobscan.co/blog/jobscan-chrome-extension (search cache).

---

## 14. Interview Preparation

### Description

An AI-powered tool that generates tailored interview questions based on a specific job description. Users can practice answering and receive AI feedback.

### How it works

1. Paste a job description.
2. AI analyses the JD to predict likely interview topics and skill-based questions.
3. Generates a set of tailored questions.
4. User practices answering (text-based).
5. AI provides feedback on responses.

### Free vs Paid

Premium only *[inference — not explicitly confirmed in sources]*.

### Third-party dependency

Uses AI internally. **Our substitute:** Gemini API for question generation and answer evaluation. Fully replicable.

> **Sources:** https://www.jobscan.co/interview-preparation (search cache); ZDNet Jobscan AI tools 2024 article.

---

## 15. How the Match Rate Works

### Overview

The match rate is a **weighted composite score (0–100%)** comparing a resume against a specific job description. It is **not a simple keyword count** — it uses NLP, TF-IDF concepts, synonym detection, and section-aware analysis.

### Approximate category weights

| Category | Weight (approx.) | Evidence |
|----------|------------------|----------|
| Hard skills | ~40–50% | Reddit reverse-engineering; Jobscan blog descriptions |
| Job title match | ~15–20% | Reddit reverse-engineering |
| Soft skills | ~10–15% | Jobscan blog; Reddit |
| Education / certifications | ~5–10% | Jobscan blog |
| Other keywords (industry terms, action verbs) | ~10–15% | Jobscan blog |
| Formatting & ATS readability | ~5% (variable) | Jobscan blog; The Balance Money |

> *[inference]* Exact weights are not published by Jobscan. The above comes from Reddit user reverse-engineering and Jobscan blog posts that describe relative importance. Jobscan has stated hard skills are "most heavily weighted."

### Keyword scoring mechanics

| Mechanic | Description | Evidence level |
|----------|-------------|----------------|
| **Exact match** | Full credit when the exact keyword from the JD appears in the resume. | Fact — Jobscan blog |
| **Synonym match** | Partial credit (~70–80% of exact match) for recognised synonyms (e.g. "project management" ↔ "program management"). | Fact — Jobscan support/synonym-matching page |
| **Acronym handling** | "SEO" and "Search Engine Optimization" are tracked separately; Jobscan recommends including both. | Fact — Jobscan blog |
| **Frequency** | Keywords appearing multiple times in the JD carry more weight. Having a keyword 2–3× in the resume gives full credit; 1× gives partial credit; 5+× may be flagged as keyword stuffing. | Fact — Jobscan blog; *[inference]* on exact thresholds |
| **TF-IDF concepts** | Terms that are specific to the job posting (not generic filler) are scored higher. | Fact — Jobscan blog describes the concept; Medium career-tech article |
| **Logarithmic returns** | First mention provides the most value; each subsequent mention has diminishing returns. | *[inference]* from Resume Worded analysis of ATS scoring generally |
| **Section-aware scoring** | Where a keyword appears (skills section vs buried in a paragraph) may influence scoring. | Fact — Jobscan blog "section-aware scanning" |
| **Predicted importance** | Keywords from the JD title and requirements section are weighted higher than "nice to have" mentions. Requirements ~2× weight vs preferred. | *[inference]* from Resume Worded; consistent with Jobscan's "predicted importance" badges |

### Recommended target score

Jobscan recommends **≥75% match rate** (some sources say ≥80%) before submitting. Users report improved callback rates above this threshold, though a high score alone does not guarantee interviews.

### What the score simulates

Jobscan's algorithm attempts to **predict how major ATS platforms** (Taleo, Greenhouse, Lever, iCIMS, Workday) parse and rank resumes, simulating an **average across common ATS systems** rather than any single one.

> **Sources:** https://www.jobscan.co/support/how-match-rate-works; https://www.jobscan.co/blog/how-jobscan-works; https://www.jobscan.co/blog/how-scoring-works; https://www.jobscan.co/blog/ats-resume-scoring; https://www.jobscan.co/blog/improve-match-rate; https://www.jobscan.co/support/synonym-matching; Reddit r/resumes discussions on scoring weights; Resume Worded ATS scoring explainer (all via search cache).

---

## 16. Account & Platform Features

### Authentication

| Method | Description |
|--------|-------------|
| **Email + password** | Standard registration with email verification. |
| **Google Sign-In** | One-click OAuth via Google account. |
| **Password reset** | Standard email-based flow. |

### Dashboard

- **Scan history:** All previous resume scans with match rates, viewable and re-scannable.
- **Job Tracker:** Kanban board (see §11).
- **Saved resumes:** Multiple resumes stored in account.
- **Saved JDs:** Job descriptions from previous scans.

### Settings & Account management

- Update email and password.
- Subscription plan management (upgrade/downgrade/cancel).
- Email preferences / notification settings.

### Data & Privacy

| Feature | Description |
|---------|-------------|
| **Data export** | Account Settings → Privacy & Data → Export My Data. Downloadable file with scan history, resumes, account info. |
| **Account deletion** | Account Settings → Privacy & Data → Delete My Account. Permanent, irreversible. |
| **GDPR/CCPA compliance** | Full data rights: deletion, portability, cookie management. |
| **Privacy policy** | Covers data collected via Google Sign-In, email registration, and third-party integrations. |

### Emails sent by Jobscan

| Type | Description |
|------|-------------|
| Scan result summaries | Match rate and tips after a scan. |
| Re-engagement reminders | "Come back and scan" nudges. |
| Weekly job search tips | Educational content. |
| Marketing / upsell | Premium plan promotions and discounts. |
| Account notifications | Password resets, billing, plan changes. |
| Product updates | New feature announcements. |
| Blog / newsletter | New blog posts and webinars. |

All marketing emails have unsubscribe links; preferences manageable in Settings.

> **Sources:** https://www.jobscan.co/login; https://www.jobscan.co/account; https://support.jobscan.co (account deletion, data export articles); https://www.jobscan.co/privacy; Reddit r/jobs account discussions (all via search cache).

---

## 17. Out of Scope for Us

These Jobscan features require **partnerships, B2B agreements, or team/enterprise contexts** that are incompatible with our individual-only, self-hosted model.

| Feature | Reason out of scope |
|---------|-------------------|
| **Enterprise / team plans** | Multi-user licensing, admin dashboards, bulk access — B2B product. |
| **University / career-center partnerships** | Co-branded portals, institutional access, usage analytics for career services teams. |
| **Recruiter tools** | Resume scoring from the recruiter's perspective, candidate screening — opposite side of the market. |
| **Partner program** | Career coaches, outplacement firms, workforce orgs — requires co-branding, API integrations, volume licensing, dedicated account management. |
| **Job board (aggregated listings)** | Requires licensed data feeds from Appcast, Joveo, Indeed Publisher Program, etc. Cannot be replicated without commercial partnerships. See §12 for our substitute approach. |
| **ATS identification database** (partially) | The URL-pattern database is maintainable as open-source, but providing per-ATS formatting tips at Jobscan's depth requires ongoing reverse-engineering of 100+ ATS platforms. We can ship a basic version (P2). |

> **Sources:** https://www.jobscan.co/enterprise; https://www.jobscan.co/partners/universities; https://www.jobscan.co/recruiter; https://www.jobscan.co/partners (all via search cache).

---

## 18. Build List

Prioritised features for ResumeArchitect, each with a one-line acceptance criterion a tester could verify.

### Priority Definitions

- **P0 — Must have (MVP):** Core value proposition; ship before launch.
- **P1 — Should have:** High value; ship within first month post-launch.
- **P2 — Nice to have:** Differentiators; ship when resources allow.

| Pri | Feature | Acceptance Criterion |
|-----|---------|---------------------|
| P0 | **Resume Scanner / Match Rate** | User pastes resume + JD, receives a 0-100% match rate and per-keyword found/missing list within 10s. |
| P0 | **Hard Skills Extraction & Matching** | Scanner extracts hard skills from JD, shows each as found/missing in resume with frequency count. |
| P0 | **Soft Skills Extraction & Matching** | Scanner identifies soft skills from JD, shows found/missing status. |
| P0 | **Searchability Checks** | Report checks contact info, summary, section headings, date formatting, education, job title, and file type, with pass/fail per item. |
| P0 | **Formatting Checks** | Report detects tables, headers/footers, graphics, special characters, columns, and text boxes, flagging each. |
| P0 | **Recruiter Tips** | Report checks measurable results, word count, words to avoid, web presence, and job level match. |
| P0 | **Gemini API Key Management** | User can enter, validate, and store their own Gemini API key in settings; all AI calls use it. |
| P0 | **Auth (email + OAuth)** | User can sign up / log in with email+password or Google; password reset works. |
| P1 | **One-Click Optimize (AI Rewrite)** | User clicks "Optimize" and receives an AI-rewritten resume tailored to the JD, with updated match rate. |
| P1 | **Power Edit (Live Scoring)** | User edits resume text in-browser; match rate updates within 2s of each pause in typing. |
| P1 | **Cover Letter Scanner** | User pastes cover letter + JD; receives keyword match analysis and missing skills list. |
| P1 | **AI Cover Letter Generator** | User inputs resume + JD; receives a generated cover letter; can export as PDF/DOCX. |
| P1 | **Resume Templates (ATS-friendly)** | At least 4 ATS-safe templates available; user can fill in content and export as PDF and DOCX. |
| P1 | **Resume Builder** | Form-based builder: user enters sections (contact, summary, experience, education, skills), picks template, exports. |
| P1 | **Scan History & Dashboard** | User can view all previous scans with match rates, re-open any past report. |
| P1 | **Synonym & Acronym Detection** | Scanner recognises common synonyms (e.g. "JS"↔"JavaScript") and flags when both forms should be included. |
| P1 | **Predicted Skills** | After scan, suggest additional skills likely relevant to the role (via Gemini or skills taxonomy) even if not in JD. |
| P1 | **Job Tracker (Kanban)** | User can save jobs with title/company/JD, move through stages (Wishlist→Applied→Interview→Offer→Rejected), add notes. |
| P2 | **LinkedIn Profile Optimiser** | User pastes LinkedIn profile text + target JD; receives keyword/completeness analysis and improvement suggestions. |
| P2 | **Interview Prep (AI Questions)** | User pastes JD; receives tailored interview questions; can practice answering and get AI feedback. |
| P2 | **ATS Identification** | User pastes job listing URL; app identifies the ATS from URL patterns and shows formatting tips. |
| P2 | **Chrome Extension** | Extension extracts JD from job board pages, triggers scan, saves job to tracker — all from the browser. |
| P2 | **Data Export & Deletion** | User can export all their data as a downloadable archive and permanently delete their account. |
| P2 | **CSV Export (Job Tracker)** | User can export their job tracker data to CSV. |
| P2 | **Multiple Resume Management** | User can save and manage multiple resume versions, selecting which to scan per job. |
| P2 | **Email Notifications (opt-in)** | User can opt in to scan-result summaries and job search tips via email. |

---

## Appendix: Sources Index

| # | URL | What was sourced |
|---|-----|-----------------|
| 1 | https://www.jobscan.co/pricing | Pricing tiers, free vs premium feature matrix |
| 2 | https://www.jobscan.co/features | Feature overview, resume scanner description |
| 3 | https://www.jobscan.co/support/match-report | Match report sections breakdown |
| 4 | https://www.jobscan.co/blog/how-scoring-works | Scoring weights, category descriptions |
| 5 | https://www.jobscan.co/blog/understanding-match-report | Per-section explanations |
| 6 | https://www.jobscan.co/blog/how-jobscan-works | NLP, keyword scoring algorithm |
| 7 | https://www.jobscan.co/support/how-match-rate-works | Composite score explanation |
| 8 | https://www.jobscan.co/blog/ats-resume-scoring | TF-IDF, ATS simulation approach |
| 9 | https://www.jobscan.co/blog/improve-match-rate | Keyword frequency recommendations |
| 10 | https://www.jobscan.co/support/synonym-matching | Synonym/acronym partial credit |
| 11 | https://www.jobscan.co/blog/one-click-optimize | One-Click Optimize feature description |
| 12 | https://www.jobscan.co/cover-letter | Cover letter scanner/generator |
| 13 | https://www.jobscan.co/blog/ai-cover-letter-generator | AI cover letter generation flow |
| 14 | https://www.jobscan.co/linkedin-optimization | LinkedIn optimisation feature |
| 15 | https://www.jobscan.co/applicant-tracking-systems | ATS identification feature |
| 16 | https://www.jobscan.co/blog/how-to-find-which-ats-company-uses | ATS detection methodology |
| 17 | https://www.jobscan.co/blog/predicted-skills | Predicted skills feature |
| 18 | https://www.jobscan.co/job-tracker | Job tracker feature |
| 19 | https://www.jobscan.co/job-search | Job search / aggregated listings |
| 20 | https://www.jobscan.co/resume-builder | Resume builder |
| 21 | https://www.jobscan.co/resume-templates | ATS-friendly templates |
| 22 | https://www.jobscan.co/interview-preparation | Interview prep tool |
| 23 | https://www.jobscan.co/chrome-extension | Chrome extension |
| 24 | https://www.jobscan.co/enterprise | Enterprise features |
| 25 | https://www.jobscan.co/partners | Partner program |
| 26 | https://www.jobscan.co/partners/universities | University partnerships |
| 27 | https://www.jobscan.co/recruiter | Recruiter tools |
| 28 | https://www.jobscan.co/privacy | Privacy policy, GDPR |
| 29 | https://www.jobscan.co/blog/ats-resume-formatting | Formatting checks detail |
| 30 | https://www.jobscan.co/resume-writing-guide | Recruiter tips section |
| 31 | https://www.jobscan.co/blog/how-many-times-to-use-keywords-resume | Keyword frequency guidance |
| 32 | Reddit r/resumes — various threads | Scoring weight reverse-engineering, user experience |
| 33 | Reddit r/jobs — various threads | User reviews, pros/cons, ATS detection feedback |
| 34 | TechRadar Jobscan review 2024 | One-Click Optimize, general feature review |
| 35 | Forbes Jobscan review | Feature comparison, One-Click Optimize |
| 36 | The Muse Jobscan review | Cover letter scanner, LinkedIn optimisation |
| 37 | The Balance Money Jobscan review | Resume builder, ATS features |
| 38 | Chrome Web Store — Jobscan Job Tracker | Extension features, 200K+ users, 4+ stars |
| 39 | ZDNet Jobscan AI tools 2024 | Interview prep, ML/NLP capabilities |
| 40 | Resume Worded — ATS scoring explainer | TF-IDF, logarithmic returns, general ATS mechanics |

> **Note:** All jobscan.co URLs returned HTTP 403 when fetched directly by automated tools. All facts from these URLs were obtained via web search result snippets, cached content, and cross-referenced with third-party reviews. Where information could not be directly verified, it is marked *[inference]*.
