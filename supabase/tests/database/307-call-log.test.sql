-- Database tests for the call log (bundle LOGS-1, part c; Robert, 6 Nov 2026: the user ID on every
-- call, kept 30 days, owner and admin only).
-- What it proves:
-- - log_calls(): a visitor's calls are stored with no user ID, a member's under their own ID even
--   when the batch claims another; a bad entry is skipped, not an error; the outcome comes from
--   the status; route IDs are replaced; more than 50 entries are refused;
-- - the per-minute limit for one account stops storing at the limit;
-- - policy call_log_select_admin: allowed for owner and admin, denied for a moderator and a member;
--   nobody signed in may write to the table directly;
-- - admin_list_calls(): newest first, with filters for failures and one person, and looking at one
--   person is audited; a moderator is refused; an unknown username is refused;
-- - admin_call_failures(): failures grouped with counts;
-- - purge_old_call_log() deletes only rows older than 30 days.
-- Personas: adult_writer (…01), teacher (…07), owner (…08), admin (…09), moderator (…10).
-- Test data: calls named "t307_…", rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Only this file's rows count.
delete from public.call_log;

/* ---------- 1. Writing ---------- */

select pg_temp.sign_out();
select is(public.log_calls('[
  {"kind": "rpc", "name": "t307_visitor", "method": "POST", "status": 200, "duration_ms": 12,
   "route": "/s/abc/00000000-0000-4000-9000-000000000001", "version": "local",
   "called_at": "2000-01-01T00:00:00Z"}
]'::jsonb), 1, 'a visitor''s call is stored');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.log_calls('[
  {"kind": "rpc", "name": "t307_ok", "method": "POST", "status": 200, "duration_ms": 30,
   "route": "/discover", "version": "abc123", "user_id": "00000000-0000-4000-8000-000000000007"},
  {"kind": "table", "name": "t307_denied", "method": "GET", "status": 403, "error_code": "42501",
   "duration_ms": 8, "route": "/write", "version": "abc123"},
  {"kind": "function", "name": "t307_down", "method": "POST", "status": 0, "duration_ms": 5000,
   "route": "/write", "version": "abc123"},
  {"kind": "rpc", "name": "bad name with spaces", "method": "POST", "status": 200, "duration_ms": 1,
   "route": "/", "version": "abc123"},
  {"kind": "spy", "name": "t307_spy", "method": "POST", "status": 200, "duration_ms": 1,
   "route": "/", "version": "abc123"}
]'::jsonb), 3, 'a member''s valid calls are stored and the bad ones skipped');

select pg_temp.as_postgres();
select is((select user_id from public.call_log where call_name = 't307_visitor'), null,
  'a visitor''s call has no user ID');
select is((select count(*)::integer from public.call_log
           where call_name like 't307_%' and user_id = '00000000-0000-4000-8000-000000000001'), 3,
  'a member''s calls carry their own user ID, never one from the batch');
select is((select route_path from public.call_log where call_name = 't307_visitor'), '/s/abc/:id',
  'an ID in the route is replaced');
select isnt((select called_at from public.call_log where call_name = 't307_visitor'),
  '2000-01-01T00:00:00Z'::timestamptz, 'an unbelievable time becomes the server''s');
select is((select array_agg(outcome order by call_name) from public.call_log
           where call_name in ('t307_denied', 't307_down', 't307_ok')),
  array['client_error', 'network_error', 'ok'], 'the outcome comes from the status');

select pg_temp.sign_out();
select throws_ok(
  $$ select public.log_calls((select jsonb_agg(jsonb_build_object('kind', 'rpc', 'name', 't307_many',
       'method', 'POST', 'status', 200, 'duration_ms', 1, 'route', '/', 'version', 'local'))
     from generate_series(1, 51))) $$,
  '22023', null, 'more than 50 calls in one batch are refused');

/* ---------- 2. The per-minute limit ---------- */

select pg_temp.as_postgres();
update public.settings set value = '5'::jsonb where key = 'call_log_per_minute_member';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.log_calls((select jsonb_agg(jsonb_build_object('kind', 'rpc', 'name', 't307_burst',
    'method', 'POST', 'status', 200, 'duration_ms', 1, 'route', '/', 'version', 'local'))
  from generate_series(1, 8))), 5, 'one account stores at most its per-minute limit');
select is(public.log_calls('[{"kind": "rpc", "name": "t307_burst", "method": "POST", "status": 200,
  "duration_ms": 1, "route": "/", "version": "local"}]'::jsonb), 0, 'and nothing more that minute');
select pg_temp.as_postgres();
update public.settings set value = '600'::jsonb where key = 'call_log_per_minute_member';

/* ---------- 3. Who may read ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok((select count(*) from public.call_log) >= 9, 'allowed: call_log_select_admin: the owner reads the log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.call_log) >= 9, 'allowed: call_log_select_admin: an admin reads the log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.call_log), 0,
  'denied: call_log_select_admin: a moderator reads nothing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.call_log), 0,
  'denied: call_log_select_admin: a member reads nothing, not even their own calls');
select throws_ok(
  $$ insert into public.call_log (call_kind, call_name, http_method, outcome, status_code,
       duration_ms, route_path, app_version)
     values ('rpc', 't307_direct', 'POST', 'ok', 200, 1, '/', 'local') $$,
  '42501', null, 'nobody writes to the table directly');

/* ---------- 4. The admin reads ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select array_agg(listed.call_name order by listed.call_name)
           from public.admin_list_calls(only_failures => true, name_contains => 't307_') as listed),
  array['t307_denied', 't307_down'], 'admin_list_calls(): only the failures, when asked');
select is((select count(*)::integer from public.admin_list_calls(person_handle => '@adult_writer',
             name_contains => 't307_') as listed
           where listed.handle = 'adult_writer'), 3,
  'admin_list_calls(): one person''s calls, with their username');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log
           where action = 'call_log.viewed_for_account'
             and target_user_id = '00000000-0000-4000-8000-000000000001'), 1,
  'looking at one person''s calls is in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select * from public.admin_list_calls(person_handle => 'nobody_t307') $$,
  'P0002', null, 'an unknown username is refused');
select is((select listed.failures from public.admin_call_failures() as listed
           where listed.call_name = 't307_denied'), 1,
  'admin_call_failures(): failures are grouped and counted');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select * from public.admin_list_calls() $$, '42501', null,
  'a moderator can''t read the call log');

/* ---------- 5. Retention ---------- */

select pg_temp.as_postgres();
update public.call_log set created_at = now() - interval '31 days' where call_name = 't307_ok';
select public.purge_old_call_log();
select is((select array_agg(distinct call_name order by call_name) from public.call_log
           where call_name in ('t307_ok', 't307_denied')),
  array['t307_denied'], 'the purge deletes only rows older than 30 days');

select * from finish();
rollback;
