-- Database tests for parental consent for under-16s (story S1-E2-03; CLAUDE.md rules 1, 13, 15;
-- GDPR art. 8).
-- What it proves:
-- - an under-16 does the age check first, then waits for a parent or guardian, read-only
--   (criterion 1);
-- - only a request signed by our server is stored, never to the writer's own email, and a new one
--   makes the old link stop working;
-- - the parent's page reads the request with the link's token, never with a user ID;
-- - a yes stores who, when and which notice versions, activates the account and tells the writer
--   (criterion 2); a no erases the account's personal data and the parent's email (criterion 3);
-- - no answer within 14 days erases the account; a withdrawn one stays (criteria 4 and 5);
-- - a withdrawal from the link or by staff makes the account read-only and tells the writer;
--   staff need a reason, and support is refused (criterion 5);
-- - turning the flag off is owner-only and logged (criterion 6);
-- - policy parental_consents_select_own: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- A payload as server/parent-consent.ts signs it, with the test secret below.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-consent-secret', 'sha256'), 'hex');
$$;
create function pg_temp.hashed(token text) returns text language sql as $$
  select encode(extensions.digest(token, 'sha256'), 'hex');
$$;
-- The answer as our server sends it: the token, the decision, English, signed.
create function pg_temp.answer(token text, decision text) returns jsonb language sql as $$
  select public.answer_parental_consent(token, decision, 'en',
    pg_temp.signed('answer|' || pg_temp.hashed(token) || '|' || decision));
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-consent-secret', 'parental_consent_secret')
  where not exists (select 1 from vault.secrets where name = 'parental_consent_secret');
select vault.update_secret(id, 'test-consent-secret') from vault.secrets
  where name = 'parental_consent_secret';

-- After March: minors may join, so adults_only is off for these tests.
update public.feature_flags set is_enabled = false where key = 'adults_only';
-- kid_14_waiting (…04) has a waiting request from seed.sql; kid_14_ok (…03) an agreed one.
-- The waiting one was made "now", so it is moved back past the one-minute wait.
update public.parental_consents set created_at = now() - interval '2 minutes'
  where user_id = '00000000-0000-4000-8000-000000000004';

/* ---------- 1. The gate ---------- */

select is(public.account_state('00000000-0000-4000-8000-000000000004'), 'awaiting_parental_consent',
  'an under-16 who passed the age check waits for a parent or guardian');
select is(public.account_state('00000000-0000-4000-8000-000000000003'), 'active',
  'an under-16 whose parent agreed is active');
update public.profiles set age_check_result = 'pending' where id = '00000000-0000-4000-8000-000000000004';
select is(public.account_state('00000000-0000-4000-8000-000000000004'), 'age_check_pending',
  'an under-16 does the age check before a parent is asked');
update public.profiles set age_check_result = '13_or_over' where id = '00000000-0000-4000-8000-000000000004';

/* ---------- 2. The writer's request ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is(public.my_parental_consent() ->> 'needs_consent', 'true', 'the writer''s page says consent is needed');
select is(public.my_parental_consent() ->> 'parent_email', 'parent.kid14waiting@example.com',
  'and shows the email they gave');
select is((select count(*)::integer from public.parental_consents), 1,
  'allowed: parental_consents_select_own: the writer reads their own request');
select throws_ok($$ select public.begin_parental_consent('mum@example.com', 'ro', repeat('a', 64), 'nope') $$,
  '42501', null, 'an unsigned request is refused, so the writer can''t make their own link');
select throws_ok(format($$ select public.begin_parental_consent('kid_14_waiting@personas.test', 'ro', %L, %L) $$,
  pg_temp.hashed('own'), pg_temp.signed('consent|00000000-0000-4000-8000-000000000004|kid_14_waiting@personas.test|ro|' || pg_temp.hashed('own'))),
  '23514', null, 'the writer''s own email is refused');
select is(public.begin_parental_consent('Mum@Example.com', 'en', pg_temp.hashed('new-link'),
    pg_temp.signed('consent|00000000-0000-4000-8000-000000000004|mum@example.com|en|' || pg_temp.hashed('new-link')))
    ->> 'handle', 'kid_14_waiting', 'a signed request is stored and answers the username for the email');
select throws_ok(format($$ select public.begin_parental_consent('dad@example.com', 'ro', %L, %L) $$,
  pg_temp.hashed('too-soon'), pg_temp.signed('consent|00000000-0000-4000-8000-000000000004|dad@example.com|ro|' || pg_temp.hashed('too-soon'))),
  '23514', null, 'a second email within a minute is refused');
select throws_ok($$ insert into public.parental_consents (user_id, parent_email, language, token_hash)
  values ('00000000-0000-4000-8000-000000000004', 'x@example.com', 'ro', 'x') $$,
  '42501', null, 'nobody writes a request directly');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.parental_consents), 0,
  'denied: parental_consents_select_own: someone else reads none');

/* ---------- 3. The parent's page ---------- */

select pg_temp.sign_out();
select is(public.parental_consent_request('seed-kid-14-waiting-consent') ->> 'outcome', 'gone',
  'the replaced link stops working');
select is(public.parental_consent_request('new-link') ->> 'handle', 'kid_14_waiting',
  'the new link shows the writer''s username');
select is(public.parental_consent_request('new-link') ->> 'writer_email', 'kid_14_waiting@personas.test',
  'and the email they signed up with (board 2.4)');
select is(public.parental_consent_request('new-link') ->> 'age_check_passed', 'true', 'and that they passed the age check');
select ok(public.parental_consent_request('new-link')::text not like '%00000000-0000-4000-8000-000000000004%',
  'never the user ID');
select is(public.parental_consent_request('a-guess') ->> 'outcome', 'gone', 'a guessed token finds nothing');

/* ---------- 4. Yes ---------- */

select throws_ok($$ select public.answer_parental_consent('new-link', 'agree', 'en', 'nope') $$,
  '42501', null, 'an unsigned answer is refused');
select is(pg_temp.answer('new-link', 'agree') ->> 'parent_email', 'mum@example.com',
  'a yes answers the parent''s email, for the confirmation');
select pg_temp.as_owner();
select is((select status || '|' || is_guardian_confirmed::text || '|' || (decided_at is not null)::text
    || '|' || (privacy_version_id is not null)::text || '|' || (terms_version_id is not null)::text
  from public.parental_consents where token_hash = pg_temp.hashed('new-link')),
  'agreed|true|true|true|true', 'the record keeps who, when, the guardian''s word and the notice versions');
select is(public.account_state('00000000-0000-4000-8000-000000000004'), 'active', 'the account is fully active');
select ok(exists (select 1 from public.notifications where user_id = '00000000-0000-4000-8000-000000000004'
  and kind = 'parental_consent_agreed'), 'the writer is told');
select pg_temp.sign_out();
select is(pg_temp.answer('new-link', 'refuse') ->> 'outcome', 'already_answered', 'a yes can''t become a no');

/* ---------- 5. Withdrawing ---------- */

select is(pg_temp.answer('new-link', 'withdraw') ->> 'outcome', 'ok', 'the parent withdraws from the same link');
select pg_temp.as_owner();
select is(public.account_state('00000000-0000-4000-8000-000000000004'), 'awaiting_parental_consent',
  'the account is read-only again');
select ok(exists (select 1 from public.notifications where user_id = '00000000-0000-4000-8000-000000000004'
  and kind = 'parental_consent_withdrawn'), 'and the writer is told');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is(public.my_parental_consent() ->> 'can_send', 'false', 'the writer can''t ask someone else instead');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_withdraw_parental_consent('00000000-0000-4000-8000-000000000003', 'x') $$,
  '42501', null, 'support can''t withdraw a consent');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_withdraw_parental_consent('00000000-0000-4000-8000-000000000003', ' ') $$,
  '23514', null, 'staff need a reason');
select ok(public.admin_withdraw_parental_consent('00000000-0000-4000-8000-000000000003',
  'The mother wrote to us on 3 November.'), 'a moderator withdraws it for a parent who wrote to us');
select pg_temp.as_owner();
select ok(exists (select 1 from public.audit_log where action = 'parental_consent.withdrawn'
  and target_user_id = '00000000-0000-4000-8000-000000000003'), 'logged');

/* ---------- 6. No, and no answer ---------- */

-- Three real (non-seed) under-16 accounts who passed the age check 15 days ago.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', ids.id, 'authenticated', 'authenticated',
  ids.handle || '@example.com', 'x', now(), '{"provider": "email", "seed_persona": true}', '{}',
  now() - interval '15 days', now(), '', '', '', ''
from (values ('00000000-0000-4000-8000-0000000000f1'::uuid, 'refused_f1'),
             ('00000000-0000-4000-8000-0000000000f2'::uuid, 'silent_f2'),
             ('00000000-0000-4000-8000-0000000000f3'::uuid, 'withdrawn_f3')) as ids (id, handle);
insert into public.profiles (id, birth_year, handle, age_check_result, age_checked_at)
select ids.id, extract(year from now())::integer - 14, ids.handle, '13_or_over', now() - interval '15 days'
from (values ('00000000-0000-4000-8000-0000000000f1'::uuid, 'refused_f1'),
             ('00000000-0000-4000-8000-0000000000f2'::uuid, 'silent_f2'),
             ('00000000-0000-4000-8000-0000000000f3'::uuid, 'withdrawn_f3')) as ids (id, handle);
-- The seed flag only skips the sign-up trigger above; a real account never has it.
update auth.users set raw_app_meta_data = '{"provider": "email"}' where id::text like '00000000-0000-4000-8000-0000000000f_';
insert into public.parental_consents (user_id, parent_email, language, token_hash, status)
values ('00000000-0000-4000-8000-0000000000f1', 'parent.f1@example.com', 'ro', pg_temp.hashed('f1-link'), 'waiting'),
       ('00000000-0000-4000-8000-0000000000f3', 'parent.f3@example.com', 'ro', pg_temp.hashed('f3-link'), 'withdrawn');

select pg_temp.sign_out();
select is(pg_temp.answer('f1-link', 'refuse') ->> 'writer_email', 'refused_f1@example.com',
  'a no answers the writer''s email, read before it is erased, so they can be told');
select pg_temp.as_owner();
select is((select (deleted_at is not null)::text || '|' || coalesce(birth_year::text, 'none') from public.profiles
  where id = '00000000-0000-4000-8000-0000000000f1'), 'true|none', 'a no erases the account and its year of birth');
select is((select count(*)::integer from public.parental_consents where user_id = '00000000-0000-4000-8000-0000000000f1'), 0,
  'and the parent''s email');

select ok(public.erase_unchecked_accounts() >= 1, 'the nightly clean-up runs');
select is((select deleted_at is not null from public.profiles where id = '00000000-0000-4000-8000-0000000000f2'), true,
  'no answer within 14 days of the age check erases the account');
select is((select deleted_at from public.profiles where id = '00000000-0000-4000-8000-0000000000f3'), null,
  'an account whose consent was withdrawn stays (what happens next is on the lawyer''s list)');

/* ---------- 7. The emergency switch ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_set_flag('parental_consent', false) $$, '42501', null,
  'an admin can''t turn parental consent off');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(public.admin_set_flag('parental_consent', false), false, 'the owner can, as an emergency switch');
select pg_temp.as_owner();
select ok(exists (select 1 from public.audit_log where action = 'settings.flag' and target_id = 'parental_consent'),
  'and it is logged');

select * from finish();
rollback;
