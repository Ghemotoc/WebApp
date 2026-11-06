-- Database tests for "Suggest me", the parent's separate yes and New and rising writers (stories
-- S1-E5-11 and S1-E2-03b, bundle LOOK-4c; Robert, 6 Nov 2026, D4: "writers 16 and over; under-16s
-- only with their parent's expressed consent"; Suggest me on for 18+, off for under-18s).
-- What it proves:
-- - may_spotlight_writer(): an adult is suggested by default and not once they switch it off; a
--   17-year-old only after switching it on; a 14-year-old only with the switch on AND the parent's
--   separate yes; a suspended writer never; Featured stays 16 and over (criteria 1 to 3);
-- - Settings › Privacy shows the switch and where the parent's yes stands (none, asked, agreed);
-- - the request to a parent is signed by our server and limited to one an hour; the parent's page
--   reads the link without signing in; the parent's yes and withdrawal are signed, tell the writer
--   and can be made with the consent email's own link (GDPR art. 7(3));
-- - the consent page's box counts only when the server signed it, and only with a yes;
-- - staff withdraw a yes with a reason, logged; support can't;
-- - rising_writers() lists a new adult writer for a visitor, never a 14-year-old without the yes,
--   never the reader themselves, never across a block, and never a user ID (rules 6 and 15).
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03, parent agreed), kid_14_waiting
-- (…04, parent not answered), moderator (…10), support (…11), suspended_user (…13), blocker (…15,
-- who blocks …16) and blocked (…16).
-- Test data: one new story each for …01, …02, …03 and …13; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

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
-- A payload as server/parent-consent.ts signs it, with the test secret below.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-consent-secret', 'sha256'), 'hex');
$$;
create function pg_temp.hashed(token text) returns text language sql as $$
  select encode(extensions.digest(token, 'sha256'), 'hex');
$$;
-- The handles rising_writers() returns, for whoever is signed in.
create function pg_temp.rising() returns text[] language sql as $$
  select coalesce(array_agg(writer ->> 'handle'), '{}')
  from jsonb_array_elements(public.rising_writers()) as writers (writer);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-consent-secret', 'parental_consent_secret')
  where not exists (select 1 from vault.secrets where name = 'parental_consent_secret');
select vault.update_secret(id, 'test-consent-secret') from vault.secrets
  where name = 'parental_consent_secret';

-- After March: minors may join, so adults_only is off; parental consent stays on.
update public.feature_flags set is_enabled = false where key = 'adults_only';
-- kid_14_ok's agreed consent gets a known link; kid_14_waiting's waiting one too.
update public.parental_consents set token_hash = pg_temp.hashed('ok-link-304')
  where user_id = '00000000-0000-4000-8000-000000000003';
update public.parental_consents set token_hash = pg_temp.hashed('wait-link-304')
  where user_id = '00000000-0000-4000-8000-000000000004';

-- A new story each, first chapter out two days ago.
insert into public.stories (id, user_id, title, slug, rating, language_code, category_id,
  first_published_at, last_chapter_published_at)
select ('00000000-0000-4000-9304-0000000000' || right(writer_id, 2))::uuid, writer_id::uuid,
  'Rising ' || right(writer_id, 2), 'rising-' || right(writer_id, 2) || '-qa304', 'all_ages', 'ro',
  (select id from public.categories where slug = 'fiction'), now() - interval '2 days', now() - interval '2 days'
from unnest(array['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
                  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000013',
                  '00000000-0000-4000-8000-000000000016']) as writers (writer_id);
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select stories.id, stories.user_id, 'q304' || right(stories.id::text, 2) || 'a1', 1,
  'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '2 days'
from public.stories where stories.slug like 'rising-%-qa304';
-- Older stories would make these writers not new; for this test only the new ones count.
update public.stories set first_published_at = now() - interval '2 days'
where user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
                  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000016')
  and first_published_at is not null;

/* ---------- 1. The rule ---------- */

select ok(public.may_spotlight_writer('00000000-0000-4000-8000-000000000001'),
  'an adult writer is suggested by default');
select ok(not public.may_spotlight_writer('00000000-0000-4000-8000-000000000002'),
  'a 17-year-old isn''t suggested until they switch it on');
select ok(not public.may_spotlight_writer('00000000-0000-4000-8000-000000000013'),
  'a suspended writer is never suggested');
-- A fresh database has no classics account yet, so a persona stands in for it here, as test 178
-- does, and the setting goes back straight after.
update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';
select ok(public.may_spotlight_writer(public.classics_account_id()), 'the classics account is');
update public.settings set value = '"clasice"'::jsonb where key = 'classics_account_handle';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.set_suggest_me(true);
select pg_temp.as_postgres();
select ok(public.may_spotlight_writer('00000000-0000-4000-8000-000000000002'),
  'a 17-year-old who switched it on is suggested');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_suggest_me(false);
select pg_temp.as_postgres();
select ok(not public.may_spotlight_writer('00000000-0000-4000-8000-000000000001'),
  'an adult who switched it off isn''t');
select ok(not public.may_feature_writer('00000000-0000-4000-8000-000000000001'),
  'and can''t be featured either');
update public.profiles set suggest_me = null where id = '00000000-0000-4000-8000-000000000001';

/* ---------- 2. A 14-year-old's switch and Settings › Privacy ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.my_privacy_settings() ->> 'suggest_me', 'false', 'a 14-year-old starts with the switch off');
select is(public.my_privacy_settings() ->> 'can_ask_parent', 'true', 'and, with a parent who agreed, can ask them');
select public.set_suggest_me(true);
select is(public.my_privacy_settings() ->> 'parent_spotlight', 'none', 'switched on, the parent hasn''t been asked yet');
select pg_temp.as_postgres();
select ok(not public.may_spotlight_writer('00000000-0000-4000-8000-000000000003'),
  'a 14-year-old with the switch on but no yes from the parent isn''t suggested');

/* ---------- 3. Asking the parent ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok(format($$ select public.begin_spotlight_request(%L, 'nope') $$, pg_temp.hashed('spot-304')),
  '42501', null, 'an unsigned request is refused, so the child can''t make their own link');
select is(public.begin_spotlight_request(pg_temp.hashed('spot-304'),
    pg_temp.signed('spotlight|00000000-0000-4000-8000-000000000003|' || pg_temp.hashed('spot-304'))) ->> 'outcome',
  'ok', 'a signed request is stored and returns the parent''s address for the email');
select is(public.my_privacy_settings() ->> 'parent_spotlight', 'asked', 'the screen now says "Waiting for your parent"');
select throws_ok(format($$ select public.begin_spotlight_request(%L, %L) $$, pg_temp.hashed('spot2-304'),
    pg_temp.signed('spotlight|00000000-0000-4000-8000-000000000003|' || pg_temp.hashed('spot2-304'))),
  '23514', null, 'a second request within the hour is refused');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.begin_spotlight_request(pg_temp.hashed('adult-304'),
    pg_temp.signed('spotlight|00000000-0000-4000-8000-000000000001|' || pg_temp.hashed('adult-304'))) ->> 'outcome',
  'not_needed', 'an adult has nobody to ask');

select pg_temp.sign_out();
select throws_ok($$ select public.begin_spotlight_request('x', 'y') $$, '42501', null,
  'a visitor can''t ask a parent');

/* ---------- 4. The parent's answer ---------- */

select is(public.parental_spotlight_request('spot-304') ->> 'handle', 'kid_14_ok',
  'the parent''s page reads the link without signing in');
select is(public.parental_spotlight_request('nothing-304') ->> 'outcome', 'gone', 'an unknown link is gone');
select throws_ok($$ select public.answer_spotlight_consent('spot-304', 'agree', 'nope') $$, '42501', null,
  'an unsigned answer is refused');
select is(public.answer_spotlight_consent('spot-304', 'agree',
    pg_temp.signed('spotlight-answer|' || pg_temp.hashed('spot-304') || '|agree')) ->> 'outcome',
  'ok', 'the parent says yes');
select pg_temp.as_postgres();
select ok(public.may_spotlight_writer('00000000-0000-4000-8000-000000000003'),
  'with the switch on and the parent''s yes, a 14-year-old is suggested');
select ok(not public.may_feature_writer('00000000-0000-4000-8000-000000000003'),
  'but is still never featured (16 and over only)');
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000003' and kind = 'spotlight_consent_agreed'),
  1, 'the writer is told their parent agreed');
select is(public.notification_category('spotlight_consent_agreed'), 'staff',
  'that notice is in the account group');
select pg_temp.sign_out();
select is(public.answer_spotlight_consent('ok-link-304', 'withdraw',
    pg_temp.signed('spotlight-answer|' || pg_temp.hashed('ok-link-304') || '|withdraw')) ->> 'outcome',
  'ok', 'the consent email''s own link withdraws the yes on its own (GDPR art. 7(3))');
select pg_temp.as_postgres();
select ok(not public.may_spotlight_writer('00000000-0000-4000-8000-000000000003'),
  'once withdrawn, the 14-year-old isn''t suggested');
select ok(public.has_parental_consent('00000000-0000-4000-8000-000000000003'),
  'and the account''s consent stands');

/* ---------- 5. The consent page's box ---------- */

update public.parental_consents set created_at = now() - interval '2 minutes'
  where user_id = '00000000-0000-4000-8000-000000000004';
select pg_temp.sign_out();
select throws_ok(format($$ select public.answer_parental_consent('wait-link-304', 'agree', 'en', %L, true) $$,
    pg_temp.signed('answer|' || pg_temp.hashed('wait-link-304') || '|agree')),
  '42501', null, 'a ticked box the server didn''t sign is refused');
select is(public.answer_parental_consent('wait-link-304', 'agree', 'en',
    pg_temp.signed('answer|' || pg_temp.hashed('wait-link-304') || '|agree|spotlight'), true) ->> 'allow_spotlight',
  'true', 'a yes with the box ticked, signed, is taken');
select pg_temp.as_postgres();
select isnt((select spotlight_agreed_at from public.parental_consents
             where user_id = '00000000-0000-4000-8000-000000000004'), null,
  'and the parent''s yes to suggestions is recorded with it');

/* ---------- 6. Staff ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_withdraw_spotlight_consent('00000000-0000-4000-8000-000000000004', 'Mum wrote') $$,
  '42501', null, 'support can''t withdraw a parent''s yes');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_withdraw_spotlight_consent('00000000-0000-4000-8000-000000000004', ' ') $$,
  '23514', null, 'a moderator must say why');
select ok(public.admin_withdraw_spotlight_consent('00000000-0000-4000-8000-000000000004', 'The mother wrote on 6 Nov'),
  'a moderator withdraws it when the parent writes to us');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'parental_spotlight.withdrawn'
           and target_user_id = '00000000-0000-4000-8000-000000000004'), 1, 'and it is logged');

/* ---------- 7. New and rising writers ---------- */

update public.profiles set suggest_me = true where id = '00000000-0000-4000-8000-000000000003';
select pg_temp.sign_out();
select ok('adult_writer' = any (pg_temp.rising()), 'a visitor sees a new adult writer');
select ok(not ('kid_14_ok' = any (pg_temp.rising())), 'but never a 14-year-old without the parent''s yes');
select ok(not ('suspended_user' = any (pg_temp.rising())), 'or a suspended writer');
select ok(not exists (select 1 from jsonb_array_elements(public.rising_writers()) as writers (writer)
                      where writer ? 'user_id' or writer::text like '%00000000-0000-4000-8000%'),
  'no card carries a user ID (rule 15)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(not ('adult_writer' = any (pg_temp.rising())), 'a writer isn''t suggested to themselves');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select ok(not ('blocked' = any (pg_temp.rising())), 'nobody across a block is suggested (rule 6)');

select * from finish();
rollback;
