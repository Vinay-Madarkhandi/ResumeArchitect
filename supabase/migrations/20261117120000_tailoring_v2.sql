-- Tailoring v2: visible pipeline stages, stored job analysis, before/after
-- scores, line-anchored changes, and a snapshot of the source resume so the
-- "original" a tailored resume is compared against never drifts when the
-- master is edited later.

alter table public.tailoring_sessions
  add column stage text check (stage in ('copy', 'markup', 'set', 'proof', 'lockup')),
  add column job_analysis jsonb,
  add column source_snapshot jsonb,
  add column changes jsonb,
  add column summary text,
  add column score_before smallint check (score_before between 0 and 100),
  add column score_after smallint check (score_after between 0 and 100);

comment on column public.tailoring_sessions.job_analysis is 'JobAnalysis (lib/schemas/jobAnalysis.ts): requirements + keywords the deterministic score is measured against.';
comment on column public.tailoring_sessions.source_snapshot is 'The source resume document exactly as it was when tailoring ran.';
comment on column public.tailoring_sessions.changes is 'Array of TailoredChange (lib/schemas/tailoring.ts): {id, op, before, after, reason, requirementIds, flags}.';
comment on column public.tailoring_sessions.change_explanations is 'Legacy (v1) change notes. Superseded by changes.';

alter table public.tailoring_sessions drop constraint tailoring_sessions_error_code_check;
alter table public.tailoring_sessions add constraint tailoring_sessions_error_code_check
  check (error_code in ('missing_api_key', 'invalid_api_key', 'invalid_jd', 'source_not_found',
    'rate_limited', 'gemini_error', 'schema_validation_failed', 'fabrication_detected', 'timeout', 'unknown'));

alter table public.resumes
  add column template text not null default 'classic' check (template in ('classic', 'modern')),
  add column reviewed_change_ids text[] not null default '{}';

comment on column public.resumes.template is 'Typeset template used for PDF/DOCX export and the on-screen page.';
comment on column public.resumes.reviewed_change_ids is 'Diff hunk ids (lib/resume/diff.ts) the user has kept, so they stop showing as unreviewed.';
comment on column public.resumes.content is 'DocumentContent JSON (lib/schemas/document.ts); legacy rows may hold ResumeContent and are upgraded on read.';
