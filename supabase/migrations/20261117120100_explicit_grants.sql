-- Explicit table privileges for the signed-in role. Newer Supabase projects
-- (and the local Postgres image) no longer grant default privileges on new
-- public tables to the Data API roles, so the app's writes failed with
-- "permission denied" despite correct RLS policies. RLS still enforces
-- ownership on every row; these grants only make the tables reachable.
-- `anon` gets nothing: every table is private to its owner.
--
-- profiles is granted whole-row on purpose: every server path (key save,
-- key decrypt, onboarding) runs as the signed-in user, not a service role,
-- so column grants can't tell the server from the browser. A user can read
-- only their own key ciphertext, which is useless without the server-side
-- GEMINI_KEY_ENCRYPTION_SECRET.

grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.resumes to authenticated;
grant select, insert, update, delete on public.job_descriptions to authenticated;
grant select, insert, update, delete on public.tailoring_sessions to authenticated;
