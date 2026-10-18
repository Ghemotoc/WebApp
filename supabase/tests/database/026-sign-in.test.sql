-- Database tests for logging in (story S1-E2-05).
-- What it proves:
-- - five wrong tries pause logging in for 15 minutes, for an email with an account and one
--   without alike, and only the email's hash is stored;
-- - tries older than the pause don't count, and a successful log-in clears them;
-- - list_my_sessions() shows a person their own sessions only, never the IP address, and marks
--   this device; end_my_session() ends their own session and never someone else's;
-- - wrong tries are readable by owner and admin only (allowed and denied).
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- Two emails: adult_writer's (an account) and one with no account. The browser hashes them.
create temp table emails as
  select public.hash_email('Adult_Writer@personas.test ') as known_hash,
         public.hash_email('nobody@example.com') as unknown_hash;
grant select on emails to anon, authenticated;

-- 1. The pause, signed out, as the log-in screen.
set local role anon;
select is(public.sign_in_pause_until((select known_hash from emails)), null, 'no pause before any wrong try');
select is(
  (select count(*)::integer from generate_series(1, 4) as tries
   where public.record_sign_in_failure((select known_hash from emails)) is null),
  4,
  'four wrong tries don''t pause logging in'
);
select isnt(public.record_sign_in_failure((select known_hash from emails)), null,
  'the fifth wrong try starts the pause');
select ok(
  public.sign_in_pause_until((select known_hash from emails)) between now() + interval '14 minutes' and now() + interval '15 minutes',
  'the pause lasts 15 minutes from the last wrong try'
);
select is(
  (select count(*)::integer from generate_series(1, 4) as tries
   where public.record_sign_in_failure((select unknown_hash from emails)) is null),
  4,
  'an email without an account counts the same'
);
select isnt(public.record_sign_in_failure((select unknown_hash from emails)), null,
  'and is paused after five tries too, so the pause reveals nothing');
select throws_ok(
  $$ select public.record_sign_in_failure('adult_writer@personas.test') $$,
  '23514', null, 'an email itself is refused: only hashes are stored'
);
select throws_ok(
  $$ select id from public.sign_in_failures $$,
  '42501',
  null,
  'denied: sign_in_failures_select_admin: a signed-out visitor cannot read the wrong tries at all'
);

-- 2. Old tries don't count; a log-in clears them.
reset role;
update public.sign_in_failures set failed_at = now() - interval '16 minutes'
  where email_hash = (select unknown_hash from emails);
select is(public.sign_in_pause_until((select unknown_hash from emails)), null,
  'tries older than 15 minutes don''t count');
select is(
  (select count(*)::integer from public.sign_in_failures where email_hash !~ '^[0-9a-f]{64}$'),
  0,
  'every stored row is a hash'
);
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated", "session_id": "10000000-0000-4000-8000-000000000001"}';
select is_empty($$ select id from public.sign_in_failures $$,
  'denied: sign_in_failures_select_admin: a member reads no wrong tries');
select lives_ok($$ select public.clear_my_sign_in_failures() $$, 'logging in clears the wrong tries');
reset role;
select is(public.sign_in_pause_until((select known_hash from emails)), null, 'the pause is gone after a log-in');

-- 3. Sessions: two of adult_writer's, one of teen_17's (sessions left by other test runs are
-- removed first, inside this transaction).
delete from auth.sessions where user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
insert into auth.sessions (id, user_id, created_at, updated_at, user_agent, ip) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', now() - interval '2 days', now(), 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', '192.0.2.1'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', now() - interval '5 days', now() - interval '1 day', 'Mozilla/5.0 (iPhone) Safari/605.1', '192.0.2.2'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', now(), now(), 'Mozilla/5.0 (Macintosh) Firefox/131.0', '192.0.2.3');
set local role authenticated;
select results_eq(
  $$ select session_id::text, is_current from public.list_my_sessions() $$,
  $$ values ('10000000-0000-4000-8000-000000000001', true), ('10000000-0000-4000-8000-000000000002', false) $$,
  'a person sees only their own sessions, newest first, with this device marked'
);
select ok(
  not exists (
    select 1 from information_schema.routines as routines
    join information_schema.parameters as parameters on parameters.specific_name = routines.specific_name
    where routines.routine_name = 'list_my_sessions' and parameters.parameter_name ilike '%ip%'
  ),
  'list_my_sessions() has no IP address column'
);
select ok(not public.end_my_session('10000000-0000-4000-8000-000000000003'),
  'ending someone else''s session does nothing');
select ok(public.end_my_session('10000000-0000-4000-8000-000000000002'),
  'a person logs one of their own devices out');

-- 4. Owner and admin may read the tries (to look into an attack).
reset role;
select public.record_sign_in_failure((select unknown_hash from emails));
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}';
select isnt_empty($$ select id from public.sign_in_failures $$,
  'allowed: sign_in_failures_select_admin: an admin reads the wrong tries (hashes and times only)');

select * from finish();

rollback;
