-- Database tests for the admin shell's server side (story S1-E11-01; architecture 1.8).
-- What it proves:
-- - a member and a visitor are refused by the server: no areas, no audit log, no export, no
--   sensitive read, and no row written;
-- - the menu is built from my_staff_areas(): each role sees exactly its areas (architecture 1.8.3);
-- - a staff session ends after staff_session_hours (12): an older session may use no area, and
--   the forged claims of these tests (no session_id) are not time-limited;
-- - a role change needs a sign-in within staff_fresh_sign_in_minutes (15), and an old sign-in is
--   refused with "sign in again" (SQLSTATE 28000) before anything changes;
-- - sensitive reads are logged, and an unknown kind is refused;
-- - the search returns usernames and a short target ID, never a full one, and honours the filters;
-- - an export is itself written to the log, with the filters used;
-- - no role, the owner included, can change or delete an audit row (append-only, S1-E1-02).
-- Policies covered elsewhere: audit_log_select_admin (013); this story adds no policy.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

-- Persona IDs (supabase/README.md).
create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support,
  '00000000-0000-4000-8000-000000000012'::uuid as editor;
grant select on ids to authenticated, anon;

-- A sign-in as Supabase's tokens carry it: the person, a fresh "amr" sign-in time (the default)
-- or an older one, and optionally the session_id of a row in auth.sessions.
create function pg_temp.sign_in_as(
  user_id uuid, signed_in_at timestamptz default now(), session_id uuid default null
) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated', 'session_id', session_id,
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from signed_in_at)::bigint))
  )::text, true);
$$;

-- Two sessions for the admin in Supabase's own table: one fresh, one 13 hours old.
insert into auth.sessions (id, user_id, created_at, updated_at)
values ('10000000-0000-4000-8000-000000000001', (select admin from ids), now(), now()),
       ('10000000-0000-4000-8000-000000000002', (select admin from ids), now() - interval '13 hours', now());

/* ---------- 1. Members and visitors are refused by the server ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select is_empty($$ select * from public.my_staff_areas() $$,
  'a member gets no admin areas');
select throws_ok($$ select * from public.admin_search_audit_log() $$, '42501', null,
  'a member can''t search the audit log');
select throws_ok($$ select * from public.admin_export_audit_log() $$, '42501', null,
  'a member can''t export the audit log');
select throws_ok($$ select public.log_sensitive_read('email_revealed', 'profiles') $$, '42501', null,
  'a member can''t write a sensitive read');
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok($$ select * from public.my_staff_areas() $$, '42501', null,
  'a visitor can''t even ask for admin areas');
reset role;
select is((select count(*)::integer from public.audit_log where created_at = now()), 0,
  'none of those refused calls wrote anything');

/* ---------- 2. The menu follows the roles table ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select ok(
  (select array_agg(area order by area) from public.my_staff_areas())
    @> array['audit_log', 'roles', 'moderation', 'settings', 'open_market'],
  'the owner sees every area, opening a market included');
select pg_temp.sign_in_as((select admin from ids));
select ok(not exists (select 1 from public.my_staff_areas() where area = 'open_market'),
  'an admin doesn''t see "open a market" (owner only)');
select is((select access from public.my_staff_areas() where area = 'audit_log'), 'act',
  'an admin may act on the audit log (search and export)');
select pg_temp.sign_in_as((select moderator from ids));
select results_eq(
  $$ select area, access from public.my_staff_areas() where area in ('moderation', 'metrics', 'audit_log', 'safeguarding') order by area $$,
  $$ values ('metrics', 'view'), ('moderation', 'act') $$,
  'a moderator sees moderation and metrics, not the audit log, and not safeguarding without the permission');
select pg_temp.sign_in_as((select support from ids));
select results_eq(
  $$ select area, access from public.my_staff_areas() order by area $$,
  $$ values ('data_requests', 'act'), ('reveal_email', 'act'), ('stories', 'view'), ('users', 'view') $$,
  'support sees users and stories to view, data requests and revealing an email');
select pg_temp.sign_in_as((select editor from ids));
select is_empty($$ select * from public.my_staff_areas() $$,
  'a content editor has no area yet (decided 17 Oct 2026, 19:19)');

/* ---------- 3. Sessions end after 12 hours ---------- */

select pg_temp.sign_in_as((select admin from ids), now(), '10000000-0000-4000-8000-000000000001');
select ok(public.is_staff_session(), 'a session started just now is a staff session');
select pg_temp.sign_in_as((select admin from ids), now(), '10000000-0000-4000-8000-000000000002');
select ok(not public.is_staff_session(), 'a session started 13 hours ago is no longer a staff session');
select is_empty($$ select * from public.my_staff_areas() $$,
  'after 12 hours the admin sees no area until they sign in again');
select throws_ok($$ select * from public.admin_search_audit_log() $$, '42501', null,
  'after 12 hours the admin can''t read the audit log either');
select pg_temp.sign_in_as((select admin from ids));
select ok(public.is_staff_session(),
  'a token without a session_id (only these tests forge one) is not time-limited');

/* ---------- 4. Changing a role needs a fresh sign-in ---------- */

select pg_temp.sign_in_as((select admin from ids), now() - interval '20 minutes');
select ok(not public.staff_signed_in_recently(), 'a sign-in 20 minutes ago is not recent');
select throws_ok(
  $$ select public.admin_grant_role((select teacher from ids), 'support', 'Joins support') $$,
  '28000', 'Sign in again to change a staff role.',
  'an admin who signed in 20 minutes ago must sign in again to change a role');
reset role;
select is_empty($$ select 1 from public.staff_roles where user_id = (select teacher from ids) $$,
  'nothing changed while the fresh sign-in was missing');
set local role authenticated;
select pg_temp.sign_in_as((select admin from ids), now() - interval '5 minutes');
select ok(public.staff_signed_in_recently(), 'a sign-in 5 minutes ago is recent');
select ok(public.admin_grant_role((select teacher from ids), 'support', 'Joins support'),
  'with a recent sign-in the same change goes through');

/* ---------- 5. Sensitive reads are logged ---------- */

select pg_temp.sign_in_as((select moderator from ids));
select lives_ok(
  $$ select public.log_sensitive_read('email_revealed', 'profiles', (select adult_writer from ids)::text, (select adult_writer from ids)) $$,
  'a moderator revealing an email writes a sensitive read');
select throws_ok(
  $$ select public.log_sensitive_read('peeked', 'profiles') $$, '23514', null,
  'an unknown kind of sensitive read is refused');

/* ---------- 6. Search and export ---------- */

select pg_temp.sign_in_as((select admin from ids));
select results_eq(
  $$ select staff_handle, action, target_handle, target_user_id_short
     from public.admin_search_audit_log(action_prefix => 'sensitive_read.', from_date => current_date) limit 1 $$,
  $$ values ('moderator', 'sensitive_read.email_revealed', 'adult_writer', '00000000') $$,
  'the search shows usernames and an 8-character target ID, never a full user ID');
select is(
  (select count(*)::integer from public.admin_search_audit_log(staff_handle => '@Moderator', from_date => current_date)),
  (select count(*)::integer from public.audit_log where user_id = (select moderator from ids) and created_at >= current_date),
  'the staff member filter finds the person by username, whatever the case or the @');
select is_empty(
  $$ select * from public.admin_search_audit_log(from_date => current_date + 1) $$,
  'a date range in the future finds nothing');
select is(
  (select count(*)::integer from public.admin_export_audit_log(action_prefix => 'staff.', from_date => current_date)),
  (select count(*)::integer from public.audit_log where action like 'staff.%' and created_at >= current_date),
  'the export returns every row the filters match');
select results_eq(
  $$ select action, after_values ->> 'action_prefix' from public.audit_log
     where action = 'audit_log.exported' and created_at = now() $$,
  $$ values ('audit_log.exported', 'staff.') $$,
  'the export is itself in the audit log, with the filters used');
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select * from public.admin_export_audit_log() $$, '42501', null,
  'a moderator can''t export the audit log');

/* ---------- 7. Append-only for everyone ---------- */

select pg_temp.sign_in_as((select owner from ids));
select throws_ok($$ update public.audit_log set reason = 'edited' where created_at = now() $$, '42501', null,
  'the owner can''t change an audit row');
select throws_ok($$ delete from public.audit_log where created_at = now() $$, '42501', null,
  'the owner can''t delete an audit row');

select * from finish();

rollback;
