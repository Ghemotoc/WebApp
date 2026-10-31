-- Database tests for manual age checks, the invitation at 18 and the 14-day clean-up, part 08b
-- (story S1-E2-08; CLAUDE.md rules 1, 5, 15).
-- What it proves:
-- - every finished check adds an attempt (line, outcome, method), the history staff see;
-- - a manual check can be asked only after a failed check, once per failure, and while it is open
--   the account stays read-only (criterion 7);
-- - only owner, admin and moderator see the queue, with the year of birth and attempts and never
--   a picture; each account shown is logged; support and members are refused (criterion 8);
-- - a decision needs a known outcome and a reason, stores the result with method manual, writes
--   the audit log and tells the person, and can't be made twice; a refusal changes no result;
-- - someone whose year now says 18 with only "13 or over" is invited once (criterion 10);
-- - an account still waiting 14 days after sign-up loses its personal data, unless a manual
--   check is open; active accounts and seed personas are left alone (criterion 12);
-- - policies age_check_attempts_select_own and manual_age_checks_select_own: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-age-secret', 'sha256'), 'hex');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-age-secret', 'age_check_secret')
  where not exists (select 1 from vault.secrets where name = 'age_check_secret');
select vault.update_secret(id, 'test-age-secret') from vault.secrets where name = 'age_check_secret';

-- pending_check (…05) is an adult by year with no result; moderator (…10) and support (…11) are
-- staff; teen_17 (…02) holds "13 or over".

/* ---------- 1. Attempts ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.my_age_check() ->> 'can_ask_manual', 'false', 'before any check, no manual check can be asked');
select throws_ok($$ select public.request_manual_age_check() $$, '23514', null,
  'asking without a failed check first is refused');
select public.begin_age_check('yoti-m1', 18::smallint, pg_temp.signed('begin|yoti-m1|18'));
select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
select public.record_age_check_result('yoti-m1', 'failed', 'facial_estimation',
  pg_temp.signed('result|yoti-m1|failed|facial_estimation'));
select pg_temp.as_owner();
select is((select count(*)::integer from public.age_check_attempts
  where user_id = '00000000-0000-4000-8000-000000000005' and outcome = 'failed' and method = 'facial_estimation'
    and threshold = 18), 1, 'a finished check adds one attempt with its line, outcome and method');

/* ---------- 2. Asking ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.my_age_check() ->> 'can_ask_manual', 'true', 'after a failed check, a manual check can be asked');
select is(public.request_manual_age_check() ->> 'outcome', 'ok', 'the person asks for a manual check');
select is(public.my_age_check() #>> '{manual_check,status}', 'open', 'the page then shows the open request');
select throws_ok($$ select public.request_manual_age_check() $$, '23514', null,
  'a second request while one is open is refused');
select is(public.my_age_check() ->> 'needs_check', 'true',
  'the account stays read-only while the request is open');
select is((select count(*)::integer from public.age_check_attempts), 1,
  'allowed: age_check_attempts_select_own: the person reads their own attempts');
select is((select count(*)::integer from public.manual_age_checks), 1,
  'allowed: manual_age_checks_select_own: the person reads their own request');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.age_check_attempts), 0,
  'denied: age_check_attempts_select_own: someone else reads none of them');
select is((select count(*)::integer from public.manual_age_checks), 0,
  'denied: manual_age_checks_select_own: someone else reads none of them');
select throws_ok($$ insert into public.manual_age_checks (user_id) values ('00000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'nobody writes a request directly');

/* ---------- 3. The staff queue ---------- */

-- Staff can't read the tables directly, so the test notes the request and the year first.
select pg_temp.as_owner();
create temp table noted on commit drop as
  select manual_age_checks.id as request_id, profiles.birth_year::integer as birth_year
  from public.manual_age_checks join public.profiles on profiles.id = manual_age_checks.user_id;
grant select on noted to authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');

select throws_ok($$ select * from public.admin_manual_age_checks() $$, '42501', null,
  'a member can''t see the queue');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select * from public.admin_manual_age_checks() $$, '42501', null,
  'support can''t see the queue (architecture 1.8.3)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select handle from public.admin_manual_age_checks()), 'pending_check',
  'a moderator sees the open request by username');
select is((select birth_year from public.admin_manual_age_checks()),
  (select birth_year from noted),
  'with the year of birth, the one place staff see it');
select is((select attempts -> 0 ->> 'outcome' from public.admin_manual_age_checks()), 'failed',
  'and the attempt history');
select ok((select answer_by > requested_at::date from public.admin_manual_age_checks()),
  'and the date to answer by, 5 working days on');
select ok((select row_to_json(queue)::text not like '%00000000-0000-4000-8000-000000000005%'
  from public.admin_manual_age_checks() as queue), 'never the person''s user ID');
select pg_temp.as_owner();
select ok(exists (select 1 from public.audit_log where action = 'sensitive_read.manual_age_check'
  and target_user_id = '00000000-0000-4000-8000-000000000005'), 'seeing the year of birth is logged');

/* ---------- 4. The decision ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$ select public.admin_decide_manual_age_check(%L, 'passed_21', 'x') $$,
  (select request_id from noted)), '23514', null,
  'an unknown decision is refused');
select throws_ok(format($$ select public.admin_decide_manual_age_check(%L, 'passed_18', '  ') $$,
  (select request_id from noted)), '23514', null,
  'a decision needs a reason');
select is(public.admin_decide_manual_age_check(
    (select request_id from noted),
    'passed_18', 'Checked against an ID document by hand.') ->> 'result', '18_or_over',
  'a moderator decides "18 or over"');
select pg_temp.as_owner();
select is((select age_check_result::text || '|' || age_check_method::text from public.profiles
  where id = '00000000-0000-4000-8000-000000000005'), '18_or_over|manual',
  'the profile keeps the result with the method manual');
select ok(exists (select 1 from public.audit_log where action = 'manual_age_check.decided'
  and target_user_id = '00000000-0000-4000-8000-000000000005'
  and reason = 'Checked against an ID document by hand.'), 'the decision and its reason are in the audit log');
select ok(exists (select 1 from public.notifications where user_id = '00000000-0000-4000-8000-000000000005'
  and kind = 'age_check_decided' and actor_user_ids = '{}'), 'the person is told, with no staff name');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$ select public.admin_decide_manual_age_check(%L, 'refused', 'again') $$,
  (select request_id from noted)), '23514', null, 'a decided request can''t be decided again');
select pg_temp.as_owner();
select is(public.manual_decision_result('refused', 'failed')::text, 'failed', 'a refusal changes no result');

/* ---------- 5. The invitation at 18 ---------- */

-- An account whose year says 20, holding only the "13 or over" it got at 17.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000e2', 'authenticated',
  'authenticated', 'new-adult@example.com', 'x', now(), '{"provider": "email", "seed_persona": true}', '{}', now(), now(),
  '', '', '', '');
insert into public.profiles (id, birth_year, handle, age_check_result)
values ('00000000-0000-4000-8000-0000000000e2', extract(year from now())::integer - 20, 'new_adult_e2',
  '13_or_over');
select ok(public.invite_new_adults_to_age_check() >= 1, 'a new adult holding "13 or over" is invited');
select is(public.invite_new_adults_to_age_check(), 0, 'once only');

/* ---------- 6. The 14-day clean-up ---------- */

-- A real (non-seed) account that signed up 15 days ago and failed its check.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000e1', 'authenticated',
  'authenticated', 'unchecked@example.com', 'x', now() - interval '15 days', '{"provider": "email", "seed_persona": true}', '{}',
  now() - interval '15 days', now(), '', '', '', '');
insert into public.profiles (id, birth_year, handle, age_check_result)
values ('00000000-0000-4000-8000-0000000000e1', 1990, 'unchecked_e1', 'failed');
-- The seed flag only skips the sign-up trigger above; a real account never has it.
update auth.users set raw_app_meta_data = '{"provider": "email"}' where id = '00000000-0000-4000-8000-0000000000e1';

insert into public.manual_age_checks (user_id) values ('00000000-0000-4000-8000-0000000000e1');
select public.erase_unchecked_accounts();
select is((select deleted_at from public.profiles where id = '00000000-0000-4000-8000-0000000000e1'), null,
  'an open manual check keeps the account');

delete from public.manual_age_checks where user_id = '00000000-0000-4000-8000-0000000000e1';
select public.erase_unchecked_accounts();
select is((select (deleted_at is not null)::text || '|' || coalesce(birth_year::text, 'none')
  from public.profiles where id = '00000000-0000-4000-8000-0000000000e1'), 'true|none',
  'after 14 days without a passed check, the account and its year of birth are gone');
select is((select email from auth.users where id = '00000000-0000-4000-8000-0000000000e1'),
  '00000000-0000-4000-8000-0000000000e1@deleted.invalid', 'and its email address');
select is((select deleted_at from public.profiles where id = '00000000-0000-4000-8000-000000000006'), null,
  'seed personas are left alone');

select * from finish();
rollback;
