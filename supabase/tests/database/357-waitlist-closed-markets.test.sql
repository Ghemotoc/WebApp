-- Database tests for sign-ups from a country that isn't open yet (bundle MARKETS-2, part b; story
-- S1-E11-32).
-- What it proves:
-- - once sign-up is public (invite_only off), a sign-up from a closed market (Sweden) or with no
--   country joins the waiting list with its country instead of being refused; an invitation code
--   doesn't skip the queue from a closed market; with the waiting list off, a closed market is
--   refused as before;
-- - the person sees they wait for their country (my_waitlist(): country, market_open);
-- - Staff › Waitlist shows each country open or not; letting in a ticked person from a closed
--   market is refused, and so is a wave for a closed country; a wave for every country leaves
--   them waiting;
-- - once Sweden opens, the same person is let in; the country's age rules apply at that moment
--   (Denmark's minimum raised to 18 in the test refuses a 16-year-old who signed up under the old one).
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create temp table ids as select
  '00000000-0000-4000-8000-000000000009'::uuid as admin;
grant select on ids to authenticated, anon;

create temp table people (name text primary key, user_id uuid);
grant select on people to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- The sign-up data the form sends (as in 310), with the country the person picked.
create function pg_temp.sign_up_data(handle text, country text, invite_code text default null,
  birth_year text default '1990')
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'handle', handle, 'country', country, 'invite_code', invite_code, 'birth_year', birth_year,
    'locale', 'en', 'waitlist_interest', 'both',
    'accepted_terms_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en')));
$$;

-- Inserts a confirmed account the way Supabase Auth does and remembers it by name.
create function pg_temp.sign_up(name text, sign_up_data jsonb) returns uuid language plpgsql as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    name || '@closed-market.test', 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}',
    sign_up_data, now(), now(), now(), '', '', '', '');
  insert into people values (name, new_id);
  return new_id;
end;
$$;

create function pg_temp.entry_of(name text) returns uuid language sql as $$
  select entries.id from public.waitlist_entries as entries
  join people on people.user_id = entries.user_id where people.name = entry_of.name;
$$;

-- Sign-up is public from here on, minors included: the invited test's "any country" rule no
-- longer applies.
update public.feature_flags set is_enabled = false where key in ('invite_only', 'adults_only');

/* ---------- 1. Signing up from a closed market ---------- */

select lives_ok($$ select pg_temp.sign_up('from_sweden', pg_temp.sign_up_data('from_sweden', 'SE')) $$,
  'a sign-up from Sweden, still closed, makes the account instead of being refused');
select results_eq(
  $$ select profiles.country_code, entries.admitted_at is null from public.waitlist_entries as entries
     join public.profiles on profiles.id = entries.user_id where entries.id = pg_temp.entry_of('from_sweden') $$,
  $$ values ('SE'::text, true) $$,
  'the person waits on the list with their country');
select lives_ok($$ select pg_temp.sign_up('sweden_code', pg_temp.sign_up_data('sweden_code', 'SE', 'NOT-A-CODE')) $$,
  'from a closed market a code isn''t used, so even a wrong one doesn''t refuse the sign-up');
select ok((select admitted_at is null from public.waitlist_entries where id = pg_temp.entry_of('sweden_code')),
  'and a code doesn''t skip the queue from a closed market');
select lives_ok($$ select pg_temp.sign_up('no_country', pg_temp.sign_up_data('no_country', null)) $$,
  'a sign-up with no country joins the list too');
select lives_ok($$ select pg_temp.sign_up('from_romania', pg_temp.sign_up_data('from_romania', 'RO')) $$,
  'a sign-up from Romania, open, joins the list as before');
select lives_ok($$ select pg_temp.sign_up('from_denmark', pg_temp.sign_up_data('from_denmark', 'DK', null,
    (extract(year from now())::integer - 17)::text)) $$,
  'a 16-year-old''s sign-up from Denmark, still closed, waits too');

-- With the waiting list off, a closed market refuses the sign-up as before.
update public.feature_flags set is_enabled = false where key = 'waitlist';
select throws_ok($$ select pg_temp.sign_up('list_off', pg_temp.sign_up_data('list_off', 'SE')) $$,
  '23514', null, 'with the waiting list off, a closed market is still refused');
update public.feature_flags set is_enabled = true where key = 'waitlist';

/* ---------- 2. What the person sees ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select user_id from people where name = 'from_sweden'));
select is(public.my_waitlist() ->> 'country', 'SE', 'the person''s place names their country');
select is((public.my_waitlist() ->> 'market_open')::boolean, false,
  'and says their country isn''t open yet, so the holding page can say why they wait');

/* ---------- 3. Staff › Waitlist ---------- */

select pg_temp.sign_in_as((select admin from ids));
select is(
  (select (country ->> 'open')::boolean from jsonb_array_elements(public.admin_waitlist() -> 'countries') as country
   where country ->> 'country' = 'SE'),
  false, 'the country list shows Sweden as not open');
select throws_ok(
  format('select public.admin_admit_from_waitlist(array[%L::uuid])', pg_temp.entry_of('from_sweden')),
  '23514', 'Someone ticked can''t be let in yet: market_closed.',
  'letting in someone from a market that is still closed is refused');
select throws_ok($$ select public.admin_admit_waitlist_wave(null, 'SE', 10) $$, '23514', 'This country isn''t open yet.',
  'a wave for a closed country is refused');
select public.admin_admit_waitlist_wave(null, null, 1000);
select ok((select admitted_at is null from public.waitlist_entries where id = pg_temp.entry_of('from_sweden'))
  and (select admitted_at is not null from public.waitlist_entries where id = pg_temp.entry_of('from_romania')),
  'a wave for every country lets Romania in and leaves Sweden waiting');

/* ---------- 4. Once the market opens ---------- */

reset role;
update public.markets set status = 'open' where country_code in ('SE', 'DK');
-- Denmark's minimum age goes up to 18 while the 16-year-old waits: the rule applies when they are
-- let in.
update public.country_age_rules set minimum_age = 18, parental_consent_below = 18
where country_code = 'DK' and region_code = '';
set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));

select is(public.admin_admit_from_waitlist(array[pg_temp.entry_of('from_sweden')]), 1,
  'once Sweden opens, the admin lets the person in');
select throws_ok(
  format('select public.admin_admit_from_waitlist(array[%L::uuid])', pg_temp.entry_of('from_denmark')),
  '23514', 'Someone ticked can''t be let in yet: under_market_age.',
  'the country''s age rules apply at the moment someone is let in');
select ok((select admitted_at is null from public.waitlist_entries where id = pg_temp.entry_of('no_country')),
  'a person with no country stays waiting through every wave');

reset role;
select * from finish();
rollback;
