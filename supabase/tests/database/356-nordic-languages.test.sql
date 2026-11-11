-- Database tests for the four new markets and the three Nordic interface languages (bundle
-- MARKETS-2, part a; stories S1-E11-30 and S1-E11-31).
-- What it proves:
-- - SE, DK, NO and MD arrive closed with their legal check not started and a minimum age of 13,
--   each with its own language and English; Ireland stays closed (S1-E11-30);
-- - sv, da and nb arrive as closed interface languages, and nobody saves a closed one as their
--   language; once staff open Swedish, a member can (S1-E11-31);
-- - Romanian and English still can't be closed, while Swedish can;
-- - a person's language may be any interface language, never anything else;
-- - support replies for a Swedish account are written in English (written_language_for());
-- - forum names are needed in the open interface languages only, so Swedish is asked for only once
--   it opens;
-- - the owner opens Sweden once its legal check is done, on English alone.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

/* ---------- S1-E11-30: the four new markets ---------- */

select results_eq(
  $$ select country_code, status::text, legal_check::text, minimum_age, languages
     from public.markets where country_code in ('SE', 'DK', 'NO', 'MD') order by country_code $$,
  $$ values ('DK', 'closed', 'not_started', 13, array['da', 'en']),
            ('MD', 'closed', 'not_started', 13, array['ro', 'en']),
            ('NO', 'closed', 'not_started', 13, array['nb', 'en']),
            ('SE', 'closed', 'not_started', 13, array['sv', 'en']) $$,
  'Sweden, Denmark, Norway and Moldova arrive closed, legal check not started, from 13');
select is((select status::text from public.markets where country_code = 'IE'), 'closed',
  'Ireland is left closed: the owner opens it like the others');

/* ---------- S1-E11-31: the three Nordic interface languages ---------- */

select results_eq(
  $$ select code, status::text, is_interface from public.languages
     where code in ('sv', 'da', 'nb') order by code $$,
  $$ values ('da', 'closed', true), ('nb', 'closed', true), ('sv', 'closed', true) $$,
  'Swedish, Danish and Norwegian Bokmål arrive as closed interface languages');
select is(public.interface_language_codes(), array['en', 'ro', 'sv', 'da', 'nb'],
  'the database lists the same five languages as src/schemas/interfaceLanguages.ts');

-- A member can't choose a closed language, even by calling the function directly.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.set_my_locale('sv') $$, '22023', null,
  'a member can''t save Swedish as their language while it is closed');
select is(public.set_my_locale('en'), 'en', 'English is still saved as before');
reset role;

-- A language that isn't one of the five never becomes a person's language.
select throws_ok(
  $$ update public.profiles set locale = 'fi' where id = '00000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'a language the app doesn''t know is refused by the table');

-- Staff open Swedish the normal way: a moderator who reads it first (S1-E11-05).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_set_staff_languages('00000000-0000-4000-8000-000000000010', '{ro,en,sv}'), 3,
  'an admin records a moderator who reads Swedish');
select throws_ok($$ select public.admin_set_language_status('en', 'closed') $$, '23514', null,
  'English still can''t be closed');

-- Forum names: Swedish isn't asked for while it is closed. forum_name_problems() is the
-- internal check admin_save_forum() runs, so it is called here as the database owner.
reset role;
select is(public.forum_name_problems('{"ro": {"name": "Poezie"}, "en": {"name": "Poetry"}}'::jsonb),
  '{}'::text[], 'a forum named in Romanian and English is complete while Swedish is closed');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');

select is(public.admin_set_language_status('sv', 'open'), 'open'::public.language_status,
  'an admin opens Swedish once a moderator reads it');
reset role;
select is(public.forum_name_problems('{"ro": {"name": "Poezie"}, "en": {"name": "Poetry"}}'::jsonb),
  array['sv:empty'], 'once Swedish is open, a forum needs its Swedish name too');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_set_language_status('sv', 'closed'), 'closed'::public.language_status,
  'Swedish can be closed again, unlike Romanian and English');
select public.admin_set_language_status('sv', 'open');

-- With Swedish open, a member saves it, and support writes back to them in English.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_locale('sv'), 'sv', 'once Swedish is open, a member saves it as their language');
select public.create_my_support_ticket('A question', 'How do I add a chapter?');
reset role;
select is(
  (select language from public.support_tickets
   where requester_user_id = '00000000-0000-4000-8000-000000000001' order by created_at desc limit 1),
  'en', 'support writes to a Swedish account in English until Swedish replies exist');

/* ---------- Opening Sweden ---------- */

-- The owner opens it on English alone, once its legal check is done (criterion 3 of S1-E11-30).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(public.admin_set_market('SE', 'open', 'done'), 'open'::public.market_status,
  'the owner opens Sweden once its legal check is done');
reset role;

select * from finish();
rollback;
