-- Database tests for an invite link from a country that isn't open yet (INVITE-MARKET; Robert,
-- 26 Nov 2026: "anybody who is invited by an invite link is let in regardless if they are from a
-- country that's not on the market list yet").
-- What it proves:
-- - with sign-up public and the waiting list on, a working invite from Sweden (closed) lets the
--   person straight in and takes one of the invite's places; a wrong code still waits;
-- - with the waiting list off, a working invite from Sweden makes the account and is used, while
--   no code, or a used-up one, is refused as before;
-- - the country's own age rule still applies to an invited person (Denmark's minimum raised to 18
--   refuses a 16-year-old with a working invite), and so do the product's own age rules;
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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
    name || '@invite-closed-market.test', 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}',
    sign_up_data, now(), now(), now(), '', '', '', '');
  insert into people values (name, new_id);
  return new_id;
end;
$$;

create function pg_temp.entry_of(name text) returns uuid language sql as $$
  select entries.id from public.waitlist_entries as entries
  join people on people.user_id = entries.user_id where people.name = entry_of.name;
$$;

-- Makes a platform invite from the admin with the given places and returns its code.
create function pg_temp.platform_invite(code text, places integer default 5) returns text
language sql as $$
  insert into public.invites (user_id, purpose, code_hash, max_uses)
  values ((select admin from ids), 'platform', public.invite_code_hash(code), places);
  select code;
$$;

create function pg_temp.places_taken(code text) returns integer language sql as $$
  select use_count from public.invites where code_hash = public.invite_code_hash(code);
$$;

-- Sign-up is public from here on, minors included, so the invited test's "any country" rule
-- doesn't apply and Sweden and Denmark are closed markets.
update public.feature_flags set is_enabled = false where key in ('invite_only', 'adults_only');
update public.feature_flags set is_enabled = true where key = 'waitlist';
select pg_temp.platform_invite('SWEDENINVITE1');
select pg_temp.platform_invite('ONEPLACEONLY', 1);

/* ---------- 1. The waiting list on ---------- */

select lives_ok(
  $$ select pg_temp.sign_up('invited_sweden', pg_temp.sign_up_data('invited_sweden', 'SE', 'SWEDENINVITE1')) $$,
  'a sign-up from Sweden, still closed, with a working invite makes the account');
select ok(
  (select admitted_at is not null from public.waitlist_entries where id = pg_temp.entry_of('invited_sweden')),
  'and the invite lets the person straight in instead of waiting for Sweden');
select is(pg_temp.places_taken('SWEDENINVITE1'), 1, 'the invite gives up one of its places');
select lives_ok(
  $$ select pg_temp.sign_up('wrong_code', pg_temp.sign_up_data('wrong_code', 'SE', 'NOTACODE00')) $$,
  'a wrong code from Sweden doesn''t refuse the sign-up');
select ok(
  (select admitted_at is null from public.waitlist_entries where id = pg_temp.entry_of('wrong_code')),
  'and the person waits for Sweden as before');

/* ---------- 2. The waiting list off ---------- */

update public.feature_flags set is_enabled = false where key = 'waitlist';
select lives_ok(
  $$ select pg_temp.sign_up('invited_list_off', pg_temp.sign_up_data('invited_list_off', 'SE', 'ONEPLACEONLY')) $$,
  'with the waiting list off, a working invite from Sweden makes the account');
select results_eq(
  $$ select profiles.country_code from public.profiles
     join people on people.user_id = profiles.id where people.name = 'invited_list_off' $$,
  $$ values ('SE'::text) $$, 'the account keeps Sweden as its country');
select throws_ok(
  $$ select pg_temp.sign_up('used_up', pg_temp.sign_up_data('used_up', 'SE', 'ONEPLACEONLY')) $$,
  '23514', null, 'the same invite, now used up, doesn''t open Sweden again');
select throws_ok(
  $$ select pg_temp.sign_up('no_code', pg_temp.sign_up_data('no_code', 'SE')) $$,
  '23514', null, 'without an invite, Sweden is still refused while the list is off');

/* ---------- 3. The age rules still apply ---------- */

update public.country_age_rules set minimum_age = 18, parental_consent_below = 18
where country_code = 'DK' and region_code = '';
select throws_ok(
  format($$ select pg_temp.sign_up('young_denmark', pg_temp.sign_up_data('young_denmark', 'DK',
    'SWEDENINVITE1', %L)) $$, (extract(year from now())::integer - 17)::text),
  '23514', null, 'a 16-year-old invited from Denmark is refused by Denmark''s own minimum age');
select throws_ok(
  format($$ select pg_temp.sign_up('too_young', pg_temp.sign_up_data('too_young', 'SE',
    'SWEDENINVITE1', %L)) $$, (extract(year from now())::integer - 10)::text),
  '23514', null, 'a 10-year-old with a working invite is refused by the product''s own age rules');
select is(pg_temp.places_taken('SWEDENINVITE1'), 1, 'a refused sign-up takes no place on the invite');

reset role;
select * from finish();
rollback;
