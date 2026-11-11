-- Database tests for markets and languages (story S1-E11-05; CLAUDE.md rule 1).
-- What it proves:
-- - each language and market has a status, and markets.is_open follows it (criterion 1);
-- - a language opens only with a moderator who reads it (criterion 2);
-- - a market opens only with its legal check done and an open language, and only the owner opens
--   one (criterion 3); Australia keeps its 16 and over minimum age (criterion 4);
-- - only open languages can be chosen for a story (criterion 5); English and Română stay open;
-- - policies languages_select_public and staff_languages_select_admin: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- A third language for stories, which no moderator reads yet.
insert into public.languages (code, status) values ('hu', 'closed');

/* ---------- Who reads them ---------- */

set local role anon;
select results_eq($$ select code, is_open from public.story_language_choices() $$,
  $$ values ('da', false), ('en', true), ('nb', false), ('ro', true), ('sv', false), ('hu', false) $$,
  'allowed: languages_select_public: a visitor sees every language and which can be chosen');
select throws_ok($$ update public.languages set status = 'open' $$, '42501', null,
  'denied: languages_select_public: nobody opens a language through the API');
reset role;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.staff_languages) >= 2,
  'allowed: staff_languages_select_admin: an admin reads which languages staff read');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.staff_languages), 0,
  'denied: staff_languages_select_admin: a moderator reads none');

/* ---------- Languages (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select moderators from public.language_moderator_counts() where code = 'hu'), 0, 'nobody reads Hungarian yet');
select throws_ok($$ select public.admin_set_language_status('hu', 'open') $$, '23514', null,
  'a language no moderator reads can''t open');
select throws_ok($$ select public.admin_set_language_status('en', 'closed') $$, '23514', null,
  'an interface language stays open');
select is(public.admin_set_staff_languages('00000000-0000-4000-8000-000000000010', '{ro,en,hu}'), 3,
  'an admin records that the moderator reads Hungarian');
select is(public.admin_set_language_status('hu', 'open'), 'open'::public.language_status, 'then Hungarian opens');
select ok('hu' in (select public.open_story_languages()), 'and a story can be written in it');

/* ---------- Markets (criteria 1, 3 and 4) ---------- */

select throws_ok($$ select public.admin_set_market('US', 'ready', 'in_progress') $$, '23514', null,
  'a market isn''t ready while its legal check is in progress');
select is(public.admin_set_market('US', 'ready', 'done'), 'ready'::public.market_status,
  'with the check done it is ready to open');
select throws_ok($$ select public.admin_set_market('US', 'open', 'done') $$, '42501', null,
  'an admin can''t open a market');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(public.admin_set_market('US', 'open', 'done'), 'open'::public.market_status, 'the owner opens it');
select is((select is_open from public.markets where country_code = 'US'), true, 'and is_open follows the status');
select is((select minimum_age from public.markets where country_code = 'AU'), 16, 'Australia stays 16 and over');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'settings.market' and target_id = 'US'
                  and after_values ->> 'status' = 'open'),
  'opening a market is logged');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_set_market('GB', 'closed', 'in_progress') $$, '42501', null,
  'a member can''t change a market');

select * from finish();
rollback;
