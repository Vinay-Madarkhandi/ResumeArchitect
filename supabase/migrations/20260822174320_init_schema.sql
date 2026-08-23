-- ResumeArchitect initial schema
-- Entities: profiles -> resumes (master + tailored) -> job_descriptions -> tailoring_sessions
-- Storage: resume-uploads (original PDFs), resume-exports (generated PDFs)
-- All tables use RLS as the sole authorization boundary (no service_role key is used by the app).

-- ============================================================================
-- Tables
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  avatar_url text,
  phone text,
  location text,
  links jsonb not null default '[]'::jsonb,
  default_resume_id uuid,
  onboarding_completed_at timestamptz,
  gemini_key_ciphertext bytea,
  gemini_key_last4 text,
  gemini_key_status text not null default 'not_configured'
    check (gemini_key_status in ('not_configured', 'valid', 'invalid')),
  gemini_key_updated_at timestamptz,
  gemini_key_validated_at timestamptz,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users, created by handle_new_user trigger. Source of truth for personal info + encrypted Gemini key.';
comment on column public.profiles.gemini_key_ciphertext is 'AES-256-GCM: version(1B) || iv(12B) || authTag(16B) || ciphertext. Never selected into a client-facing response.';
comment on column public.profiles.links is 'Array of {label, url} — LinkedIn/GitHub/portfolio/etc, pre-fills a new resume''s personalInfo.links.';

create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_text text not null,
  company text,
  job_title text,
  location text,
  source_url text,
  created_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('master', 'tailored')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'archived')),
  is_default boolean not null default false,
  version integer not null default 1,
  source_resume_id uuid references public.resumes (id) on delete set null,
  source_resume_title_snapshot text,
  job_description_id uuid references public.job_descriptions (id) on delete set null,
  job_title_snapshot text,
  job_company_snapshot text,
  tailoring_session_id uuid,
  original_file_storage_path text,
  original_file_name text,
  pdf_storage_path text,
  pdf_generated_at timestamptz,
  low_confidence_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.resumes is 'Both master and tailored resumes. Tailoring never mutates the master: it always inserts a new row.';
comment on column public.resumes.content is 'Canonical ResumeContent JSON — see lib/schemas/resume.ts.';
comment on column public.resumes.low_confidence_fields is 'JSON-path-like strings the parser could not confidently populate, for the review UI to highlight.';

create table public.tailoring_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_resume_id uuid references public.resumes (id) on delete set null,
  source_resume_title_snapshot text,
  job_description_id uuid references public.job_descriptions (id) on delete set null,
  result_resume_id uuid references public.resumes (id) on delete set null,
  result_resume_title_snapshot text,
  status text not null default 'pending'
    check (status in ('pending', 'analyzing', 'generating', 'completed', 'failed')),
  error_code text
    check (error_code in ('missing_api_key', 'invalid_api_key', 'invalid_jd', 'source_not_found',
      'gemini_error', 'schema_validation_failed', 'fabrication_detected', 'timeout', 'unknown')),
  error_message text,
  change_explanations jsonb,
  gemini_model text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.tailoring_sessions is 'Tracks one tailoring run. A failed run leaves no orphaned resume row. Retry creates a new row (immutable history).';
comment on column public.tailoring_sessions.change_explanations is 'Array of {section, targetId, whatChanged, why} — never a score/percentage.';

-- Circular FKs added after both sides exist.
alter table public.profiles
  add constraint profiles_default_resume_id_fkey
  foreign key (default_resume_id) references public.resumes (id) on delete set null;

alter table public.resumes
  add constraint resumes_tailoring_session_id_fkey
  foreign key (tailoring_session_id) references public.tailoring_sessions (id) on delete set null;

-- ============================================================================
-- Indexes
-- ============================================================================

create index resumes_user_id_idx on public.resumes (user_id);
create index resumes_user_id_kind_idx on public.resumes (user_id, kind);
create unique index resumes_one_default_master_per_user
  on public.resumes (user_id) where kind = 'master' and is_default = true;
create index resumes_job_description_id_idx on public.resumes (job_description_id);
create index resumes_source_resume_id_idx on public.resumes (source_resume_id);
create index resumes_tailoring_session_id_idx on public.resumes (tailoring_session_id);

create index job_descriptions_user_id_idx on public.job_descriptions (user_id);

create index tailoring_sessions_user_id_idx on public.tailoring_sessions (user_id);
create index tailoring_sessions_user_id_status_idx on public.tailoring_sessions (user_id, status);
create index tailoring_sessions_result_resume_id_idx on public.tailoring_sessions (result_resume_id);
create index tailoring_sessions_source_resume_id_idx on public.tailoring_sessions (source_resume_id);
create index tailoring_sessions_job_description_id_idx on public.tailoring_sessions (job_description_id);

-- ============================================================================
-- updated_at maintenance
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- New user provisioning
-- Narrow, justified SECURITY DEFINER exception: only callable as an
-- `auth.users` insert trigger (trigger functions cannot be invoked via
-- PostgREST RPC), and it does nothing but insert a bare profile row keyed to
-- NEW.id. No user-controllable arguments, no data exposure.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- Every policy is scoped `to authenticated` combined with an ownership
-- predicate — never `to authenticated` alone. UPDATE policies always pair
-- USING with WITH CHECK so a row's user_id can't be reassigned.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.resumes enable row level security;
alter table public.tailoring_sessions enable row level security;

-- profiles: select/update own row only. No insert policy (rows are created
-- exclusively by handle_new_user). No delete policy (account deletion in v1
-- resets fields via update + relies on auth.users cascade for full removal).
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- job_descriptions: full CRUD scoped to owner.
create policy "job_descriptions_select_own"
  on public.job_descriptions for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "job_descriptions_insert_own"
  on public.job_descriptions for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "job_descriptions_update_own"
  on public.job_descriptions for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "job_descriptions_delete_own"
  on public.job_descriptions for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- resumes: full CRUD scoped to owner.
create policy "resumes_select_own"
  on public.resumes for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "resumes_insert_own"
  on public.resumes for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "resumes_update_own"
  on public.resumes for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "resumes_delete_own"
  on public.resumes for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- tailoring_sessions: full CRUD scoped to owner (server acts as the user, not
-- a service role, so it needs these policies to create/update session rows).
create policy "tailoring_sessions_select_own"
  on public.tailoring_sessions for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "tailoring_sessions_insert_own"
  on public.tailoring_sessions for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "tailoring_sessions_update_own"
  on public.tailoring_sessions for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "tailoring_sessions_delete_own"
  on public.tailoring_sessions for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ============================================================================
-- Storage buckets
-- Both private. Path convention: {user_id}/{resume_id}/<file>. Access only
-- via short-TTL signed URLs generated server-side, never a public URL.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('resume-uploads', 'resume-uploads', false),
       ('resume-exports', 'resume-exports', false);

create policy "resume_uploads_select_own"
  on storage.objects for select to authenticated
  using ( bucket_id = 'resume-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "resume_uploads_insert_own"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'resume-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "resume_uploads_update_own"
  on storage.objects for update to authenticated
  using ( bucket_id = 'resume-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text )
  with check ( bucket_id = 'resume-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "resume_uploads_delete_own"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'resume-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "resume_exports_select_own"
  on storage.objects for select to authenticated
  using ( bucket_id = 'resume-exports' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "resume_exports_insert_own"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'resume-exports' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "resume_exports_update_own"
  on storage.objects for update to authenticated
  using ( bucket_id = 'resume-exports' and (storage.foldername(name))[1] = (select auth.uid())::text )
  with check ( bucket_id = 'resume-exports' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "resume_exports_delete_own"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'resume-exports' and (storage.foldername(name))[1] = (select auth.uid())::text );
