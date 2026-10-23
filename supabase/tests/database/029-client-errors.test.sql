-- Database tests for the browser error log (story S1-E1-05).
-- What they prove:
-- - anyone, signed out included, can report an error, and only through report_client_error();
-- - what is stored is scrubbed and trimmed: no emails, tokens, IDs, quoted text, long numbers,
--   query strings or hashes, and nothing longer than the limits;
-- - the table has no column for a user ID, email, IP address or user agent;
-- - the shared per-minute limit drops reports beyond it;
-- - owner and admin read the log (allowed); a member, a moderator and a visitor can't (denied);
-- - the nightly purge deletes only rows older than 30 days, and pg_cron has the job.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Rows left by other runs would skew the counts below; this transaction rolls back at the end.
delete from public.client_errors;

-- The IDs that report_client_error() hands back, kept for the checks below.
create temp table reported (id uuid);
grant insert, select, delete on reported to anon, authenticated;

-- 1. Reporting, signed out.
set local role anon;
insert into reported select public.report_client_error(
  'TypeError',
  'Failed for ana.pop@example.com at https://x.test/reset?code=abc with "my secret draft" and id 0f8fad5b-d9cb-469f-a165-70867728950e, token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln, key sk_live_ABCDEFGHIJKLMNOPQRSTUVWX, phone 0722123456; can''t read ''title''',
  '/join/ABCDEFGHIJKLMNOPQRSTUVWXYZ123?code=1#top',
  'a1b2c3d',
  'firefox'
);
select isnt((select id from reported), null, 'a signed-out visitor can report an error');
select throws_ok(
  $$ insert into public.client_errors (error_name, error_message, route_path, app_version, browser_family)
     values ('x', 'y', '/', 'local', 'other') $$,
  '42501', null, 'nobody can write to the table directly'
);
select throws_ok($$ select id from public.client_errors $$, '42501', null,
  'denied: client_errors_select_admin: a signed-out visitor cannot read the log');

-- 2. What was stored.
reset role;
create temp table stored as select * from public.client_errors where id = (select id from reported);
select is((select error_name from stored), 'TypeError', 'the error name is kept');
select ok((select error_message from stored) !~ '@', 'no email address is stored');
select ok((select error_message from stored) !~* 'https?://', 'no web address is stored');
select ok((select error_message from stored) !~ 'my secret draft', 'quoted text (what someone typed) is removed');
select ok((select error_message from stored) !~ '0f8fad5b', 'IDs are removed');
select ok((select error_message from stored) !~ 'eyJ', 'signed tokens are removed');
select ok((select error_message from stored) !~ 'sk_live', 'long keys are removed');
select ok((select error_message from stored) !~ '0722123456', 'long numbers are removed');
select ok((select error_message from stored) ~ 'can''t read \[text\]', 'apostrophes in words stay; the quoted name goes');
select is((select route_path from stored), '/join/:token', 'the path keeps no query, hash or code');
select is(
  (select (app_version, browser_family)::text from stored),
  '(a1b2c3d,firefox)',
  'the app version and browser family are kept'
);
select is(
  (select count(*)::integer from information_schema.columns
   where table_schema = 'public' and table_name = 'client_errors'
     and column_name ~ '(user|email|ip|agent|account|profile)'),
  0,
  'the table has no column for a user, an email, an IP address or a user agent'
);

-- 3. Trimming and odd values, signed in as a member.
set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
delete from reported;
insert into reported select public.report_client_error(repeat('Name ', 60), repeat('word ', 400), 'no-slash', 'v1 <script>', 'netscape');
reset role;
select is(
  (select (char_length(error_name), char_length(error_message) <= 500, route_path, app_version, browser_family)::text
   from public.client_errors where id = (select id from reported)),
  '(100,t,/no-slash,unknown,other)',
  'long text is trimmed, the path starts with /, and an odd version or browser is replaced'
);

-- 4. Reading: owner and admin only.
set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select is_empty($$ select id from public.client_errors $$,
  'denied: client_errors_select_admin: a member reads no errors');
select throws_ok($$ select * from public.admin_list_client_errors() $$, '42501', null,
  'denied: a member cannot use admin_list_client_errors()');
select pg_temp.sign_in_as((select moderator from ids));
select is_empty($$ select id from public.client_errors $$,
  'denied: client_errors_select_admin: a moderator reads no errors');
select pg_temp.sign_in_as((select admin from ids));
select isnt_empty($$ select id from public.client_errors $$,
  'allowed: client_errors_select_admin: an admin reads the log');
select pg_temp.sign_in_as((select owner from ids));
select is((select count(*)::integer from public.admin_list_client_errors()), 2,
  'allowed: the owner lists the newest errors through admin_list_client_errors()');

-- 5. The shared limit: with a limit of 3 per minute and 2 rows already, one more fits.
reset role;
update public.settings set value = '3'::jsonb where key = 'client_errors_per_minute';
set local role anon;
select isnt(public.report_client_error('Error', 'third', '/', 'local', 'chrome'), null,
  'reports under the limit are stored');
select is(public.report_client_error('Error', 'fourth', '/', 'local', 'chrome'), null,
  'reports over the shared per-minute limit are dropped');

-- 6. The purge and its nightly job.
reset role;
update public.client_errors set created_at = now() - interval '31 days'
  where id = (select id from reported);
select is(public.purge_old_client_errors(), 1, 'the purge deletes only rows older than 30 days');
select is(
  (select command from cron.job where jobname = 'purge-old-client-errors'),
  'select public.purge_old_client_errors();',
  'pg_cron runs the purge every night'
);

select * from finish();

rollback;
