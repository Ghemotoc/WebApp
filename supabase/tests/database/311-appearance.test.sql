-- Database tests for the member's look on the account (bundle G2 THEMES; handoff "Themes:
-- members choose their look").
-- What it proves: every account starts on Lilac mist, Match my device and seasonal themes off; a
-- signed-in member reads and changes only their own look (allowed and denied, CLAUDE.md rule 1);
-- unknown values and signed-out visitors are refused; the API still can't update profiles
-- directly; the seasonal look dates are a public setting; "Less motion" is off until a member
-- turns it on, is saved with the look and is kept by a call that leaves it out (bundle MOTION-1).
-- How a persona is "signed in": the authenticated role plus the JWT claims, as in
-- 014-profile-locale.test.sql. Persona IDs are listed in supabase/README.md.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- Defaults: what every member sees today.
select is_empty(
  $$ select id from public.profiles where look <> 'lilac' or colour_mode <> 'device' or seasonal_looks $$,
  'every account starts on Lilac mist, Match my device, with seasonal themes off'
);

select is_empty(
  $$ select id from public.profiles where appearance_saved_at is not null $$,
  'no account has saved a look yet, so each device keeps its own choice at sign-in'
);

select is_empty(
  $$ select id from public.profiles where less_motion $$,
  'every account starts with Less motion off'
);

-- Sign in as adult_writer.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select look from public.profiles),
  'lilac',
  'allowed: profiles_select_own: adult_writer reads their own look'
);

select is(
  public.set_my_appearance('seaglass', 'night', true),
  '{"look": "seaglass", "colour_mode": "night", "seasonal_looks": true, "less_motion": false}'::jsonb,
  'adult_writer saves Sea glass, Night and seasonal themes on'
);

select results_eq(
  $$ select look, colour_mode, seasonal_looks from public.profiles where id = '00000000-0000-4000-8000-000000000001' $$,
  $$ values ('seaglass'::text, 'night'::text, true) $$,
  'the saved look is what adult_writer reads back on their next device'
);

select isnt(
  (select appearance_saved_at from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  null,
  'saving notes when, so adult_writer''s other devices take the saved look'
);

select is(
  public.set_my_appearance('seaglass', 'night', true, true) ->> 'less_motion',
  'true',
  'adult_writer turns Less motion on and it is saved on the account'
);

select is(
  public.set_my_appearance('lilac', 'light', false) ->> 'less_motion',
  'true',
  'a save that leaves Less motion out (a page loaded before the switch existed) keeps it on'
);

select is(
  public.set_my_appearance('lilac', 'light', false, false) ->> 'less_motion',
  'false',
  'adult_writer turns Less motion off again'
);

select is_empty(
  $$ select look from public.profiles where id = '00000000-0000-4000-8000-000000000002' $$,
  'denied: profiles_select_own: adult_writer cannot read teen_17''s look'
);

select throws_ok(
  $$ select public.set_my_appearance('neon', 'light', false) $$,
  '22023',
  null,
  'a theme that is not one of the six year-round themes is refused'
);

select throws_ok(
  $$ select public.set_my_appearance('winter', 'light', false) $$,
  '22023',
  null,
  'a seasonal look can''t be picked as the year-round theme'
);

select throws_ok(
  $$ select public.set_my_appearance('lilac', 'dusk', false) $$,
  '22023',
  null,
  'a mode that is not light, night or device is refused'
);

select throws_ok(
  $$ update public.profiles set look = 'candy' where id = '00000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'denied: the API can''t update the look directly, only through set_my_appearance()'
);

-- Signed out: no account to save to, and the function isn't even callable.
reset role;
set local role anon;
select throws_ok(
  $$ select public.set_my_appearance('candy', 'light', false) $$,
  '42501',
  null,
  'a signed-out visitor cannot save a look to any account'
);

-- Saving one member's look never touches anyone else's.
reset role;
select is(
  (select look from public.profiles where id = '00000000-0000-4000-8000-000000000002'),
  'lilac',
  'teen_17''s look is unchanged by other people saving theirs'
);

-- The seasonal windows are public, so the page can pick the look before anyone signs in.
select is(
  (select jsonb_array_length(value) from public.settings where key = 'seasonal_look_dates' and is_public),
  4,
  'the four seasonal look windows are a public setting'
);

select * from finish();
rollback;
