-- Application tracker status, a cover letter per application, and token
-- usage per AI run.

alter table public.resumes
  add column application_status text not null default 'saved'
    check (application_status in ('saved', 'applied', 'interviewing', 'offer', 'rejected')),
  add column application_status_updated_at timestamptz,
  add column cover_letter text;

comment on column public.resumes.application_status is 'Where this application stands (tailored resumes only): saved, applied, interviewing, offer, rejected.';
comment on column public.resumes.cover_letter is 'Plain-text cover letter for this application, editable by the user.';

alter table public.tailoring_sessions
  add column usage jsonb;

comment on column public.tailoring_sessions.usage is 'Token usage per AI step: {step: {prompt, output, total}}.';

-- Rate limiting counts a user's recent runs.
create index if not exists tailoring_sessions_user_created_idx
  on public.tailoring_sessions (user_id, created_at desc);
