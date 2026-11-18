-- Keep the user's own Word design: a resume imported from .docx (and every
-- application tailored from it) points at the uploaded file, and the Word
-- download writes the edited wording back into that file.
alter table public.resumes
  add column design_source_path text;

comment on column public.resumes.design_source_path is
  'Storage path (resume-uploads) of the .docx whose design this resume keeps. Shared by a master and the applications tailored from it.';

-- A third template for PDF uploads: centered header and plain sans, like a well-made Word resume.
alter table public.resumes drop constraint if exists resumes_template_check;
alter table public.resumes
  add constraint resumes_template_check check (template in ('classic', 'modern', 'standard'));
