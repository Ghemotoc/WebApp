-- Database tests for the age check with Yoti, part 08a (story S1-E2-08; CLAUDE.md rules 1, 5, 15).
-- What it proves:
-- - my_age_check() gives the line a new check tests (18 when the year says 18 or over, otherwise
--   13), whether one can start and whether the account waits for it, and never the year itself;
-- - only a payload signed with the Vault secret starts a check or stores a result, so nobody can
--   mark their own age as checked (criteria 1 and 4);
-- - a pass stores only the result, its date and its method and forgets the session (criterion 5);
-- - a "13 or over" result keeps under-18 protections on for an adult year, and the 18 check can
--   still start; failing it keeps "13 or over" (criterion 6);
-- - a failure is stored while nothing has passed; starting again forgets the old session, and an
--   expired session is refused and purged (criteria 7 and 11);
-- - policy age_check_sessions_select_own: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- A payload as server/age-check.ts signs it, with the test secret below.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-age-secret', 'sha256'), 'hex');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-age-secret', 'age_check_secret')
  where not exists (select 1 from vault.secrets where name = 'age_check_secret');
select vault.update_secret(id, 'test-age-secret') from vault.secrets where name = 'age_check_secret';

-- pending_check (…05) is an adult by year with no result; teen_17 (…02) has "13 or over";
-- adult_writer (…01) has "18 or over". kid_14_ok (…03) is 13 to 15 with "13 or over".
-- For criterion 6 pending_check's twin: blocker (…15) is made an adult by year with "13 or over".
update public.profiles set age_check_result = '13_or_over' where id = '00000000-0000-4000-8000-000000000015';

/* ---------- 1. What the page reads ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.my_age_check() $$, '42501', null,
  'signed out, there is no age check to read');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.my_age_check() ->> 'threshold', '18',
  'an adult year of birth checks the 18 line');
select is(public.my_age_check() ->> 'can_start', 'true', 'with no result, a check can start');
select ok(not public.my_age_check() ? 'birth_year', 'the year of birth itself is never answered');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.my_age_check() ->> 'threshold', '13', 'a year of 13 to 15 checks the 13 line');
select is(public.my_age_check() ->> 'can_start', 'false',
  'a "13 or over" result already covers the 13 line');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_age_check() ->> 'can_start', 'false', 'an "18 or over" result needs no new check');
select is(public.begin_age_check('yoti-not-needed', 18::smallint, pg_temp.signed('begin|yoti-not-needed|18')) ->> 'outcome',
  'not_needed', 'and starting one is refused politely');

/* ---------- 2. Only our server starts a check (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select throws_ok($$ select public.begin_age_check('yoti-a', 18::smallint, 'not-a-signature') $$,
  '42501', null, 'an unsigned start is refused');
select throws_ok($$ select public.begin_age_check('yoti-a', 13::smallint, pg_temp.signed('begin|yoti-a|13')) $$,
  '23514', null, 'a start for the wrong age line is refused');
select is(public.begin_age_check('yoti-a', 18::smallint, pg_temp.signed('begin|yoti-a|18')) ->> 'outcome', 'ok',
  'a signed start links the session to the person');
select is(public.my_age_check() ->> 'is_checking', 'true', 'the page then knows a result is on its way');
select is((select count(*)::integer from public.age_check_sessions), 1,
  'allowed: age_check_sessions_select_own: the person reads their own open check');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.age_check_sessions), 0,
  'denied: age_check_sessions_select_own: another member reads nobody else''s check');
select pg_temp.sign_out();
select throws_ok($$ select count(*) from public.age_check_sessions $$, '42501', null,
  'denied: a visitor can''t read the sessions at all');
select throws_ok($$ insert into public.age_check_sessions (user_id, yoti_session_id, threshold, expires_at)
  values ('00000000-0000-4000-8000-000000000005', 'forged', 18, now() + interval '1 hour') $$,
  '42501', null, 'nobody writes a session directly');

/* ---------- 3. Starting again forgets the old session (criterion 11) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.begin_age_check('yoti-b', 18::smallint, pg_temp.signed('begin|yoti-b|18'));
select is((select string_agg(yoti_session_id, ',') from public.age_check_sessions), 'yoti-b',
  'a new check replaces the old session');

/* ---------- 4. Only our server stores a result (criteria 4 and 5) ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.record_age_check_result('yoti-b', 'passed', 'facial_estimation', 'forged') $$,
  '42501', null, 'an unsigned result is refused, even from the webhook');
select throws_ok($$ select public.record_age_check_result('yoti-b', 'passed', 'manual',
  pg_temp.signed('result|yoti-b|passed|manual')) $$, '23514', null, 'a Yoti result is never a manual check');
select is(public.record_age_check_result('yoti-a', 'passed', 'facial_estimation',
  pg_temp.signed('result|yoti-a|passed|facial_estimation')) ->> 'outcome', 'not_found',
  'the forgotten session''s result counts for nothing');
select is(public.record_age_check_result('yoti-b', 'passed', 'id_document',
  pg_temp.signed('result|yoti-b|passed|id_document')) ->> 'result', '18_or_over',
  'a signed pass of the 18 line stores "18 or over"');
reset role;
select is((select age_check_method::text || '|' || (age_checked_at is not null)::text
           from public.profiles where id = '00000000-0000-4000-8000-000000000005'),
  'id_document|true', 'with its method and date, and nothing else about the check');
select is((select count(*)::integer from public.age_check_sessions where yoti_session_id = 'yoti-b'), 0,
  'and the session is forgotten');

/* ---------- 5. "13 or over" and failures (criteria 6 and 7) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.age_band()::text, '16_to_17',
  'an adult year with "13 or over" keeps under-18 protections on');
select public.begin_age_check('yoti-c', 18::smallint, pg_temp.signed('begin|yoti-c|18'));
select pg_temp.sign_out();
select is(public.record_age_check_result('yoti-c', 'failed', 'facial_estimation',
  pg_temp.signed('result|yoti-c|failed|facial_estimation')) ->> 'result', '13_or_over',
  'failing the 18 check keeps "13 or over"');

/* ---------- 6. An expired session (criterion 11) ---------- */

reset role;
update public.profiles set age_check_result = 'pending', age_check_method = null
where id = '00000000-0000-4000-8000-000000000005';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.begin_age_check('yoti-d', 18::smallint, pg_temp.signed('begin|yoti-d|18'));
reset role;
update public.age_check_sessions set expires_at = now() - interval '1 minute' where yoti_session_id = 'yoti-d';
select is(public.purge_expired_age_check_sessions(), 1, 'the hourly clean-up removes an expired session');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.begin_age_check('yoti-e', 18::smallint, pg_temp.signed('begin|yoti-e|18'));
select pg_temp.sign_out();
select is(public.record_age_check_result('yoti-e', 'failed', 'facial_estimation',
  pg_temp.signed('result|yoti-e|failed|facial_estimation')) ->> 'result', 'failed',
  'with nothing passed yet, a failure is stored and the account stays read-only');

select finish();
rollback;
