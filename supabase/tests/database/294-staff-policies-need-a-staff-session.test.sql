-- QA-1d: the clean-up record and the retired certificate codes need a staff session (independent
-- QA check, 5 Nov 2026, finding X2).
--
-- What it proves (policies retention_runs_select_admin and retired_certificate_codes_select_admin):
-- - allowed: an admin reads both in March, before the staff domain is set (S1-E2-07a);
-- - denied: once the staff domain is set, the same admin signed in with a password reads neither,
--   because the policies now go through staff_may() and so is_staff_session() (S1-E2-07b);
-- - denied: a moderator never reads them (not an area of theirs).
-- The other allowed and denied cases are in 212-retention-jobs and 236-certificates.
-- Personas: admin (…09), moderator (…10). Test data: one row in each table, made here; rolled
-- back. example.com is a test domain, never the real one.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- A session as Supabase's tokens carry it: the person and how they signed in, just now.
create function pg_temp.sign_in(persona_id uuid, method text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', persona_id, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', method, 'timestamp', extract(epoch from now())::bigint))
         )::text, true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

/* ---------- Test data, written as postgres ---------- */

insert into public.retention_runs (job_name, rows_removed) values ('qa294_test_job', 1);
insert into public.retired_certificate_codes (code) values ('QA294-TEST');

/* ---------- March: no staff domain yet ---------- */

delete from vault.secrets where name = 'staff_email_domain';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009', 'password');
select ok(exists (select 1 from public.retention_runs where job_name = 'qa294_test_job'),
  'allowed: retention_runs_select_admin: an admin reads the clean-up record in March');
select ok(exists (select 1 from public.retired_certificate_codes where code = 'QA294-TEST'),
  'allowed: retired_certificate_codes_select_admin: an admin reads the retired codes in March');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010', 'password');
select ok(not exists (select 1 from public.retention_runs where job_name = 'qa294_test_job'),
  'denied: retention_runs_select_admin: a moderator can''t read the clean-up record');
select ok(not exists (select 1 from public.retired_certificate_codes where code = 'QA294-TEST'),
  'denied: retired_certificate_codes_select_admin: a moderator can''t read the retired codes');
reset role;

/* ---------- Once the staff domain is set: a password session isn't a staff session ---------- */

select vault.create_secret('example.com', 'staff_email_domain');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009', 'password');
select ok(not exists (select 1 from public.retention_runs where job_name = 'qa294_test_job'),
  'denied: an admin signed in with a password can''t read the clean-up record once staff use Google sign-in');
select ok(not exists (select 1 from public.retired_certificate_codes where code = 'QA294-TEST'),
  'denied: nor the retired certificate codes');
reset role;

select * from finish();
rollback;
