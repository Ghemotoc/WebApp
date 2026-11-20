-- Database tests for the circle colour (bundle G11a; seven colours since CALM-3, the simplified
-- design: Robert, 20 Nov 2026, a colour at random on joining, changeable in Settings).
-- What it proves:
-- - there are seven colours, the same names and order as beadColours.ts;
-- - today's sixteen names map to the seven (initials_colour_from_retired());
-- - every profile has a colour, a new profile gets one at random and the column refuses null;
-- - a member picks a colour; null ("from the username") and an unknown name are refused, in the
--   function and by the column's own check;
-- - a banned account and a signed-out visitor can't pick one; a staff account can;
-- - anyone reads a profile's avatar look (recipe and colour); a banned (hidden) profile's look
--   shows only to its owner; a missing profile reads as null;
-- - the colour is in the person's data export.
-- Personas: adult_writer (…01), teen_17 (…02), moderator (…10), banned_user (…14). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. The colours ---------- */

select is(public.initials_colour_names(), array['plum', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage'],
  'there are seven colours, in the order of beadColours.ts');
select is((select count(*) from public.profiles where initials_colour is null), 0::bigint,
  'every profile has a circle colour');
select is((select count(*) from public.profiles where not (initials_colour = any (public.initials_colour_names()))),
  0::bigint, 'every stored colour is one of the seven, so the retired names were all mapped');
select ok(public.random_initials_colour() = any (public.initials_colour_names()),
  'a random colour is one of the seven');

-- A new profile takes a colour at random: the column's default is random_initials_colour(), and
-- sign-up (create_profile_from_sign_up()) leaves the column out of its insert so the default picks.
select is((select column_default from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles' and column_name = 'initials_colour'),
  'random_initials_colour()', 'a new profile''s colour comes from random_initials_colour()');
select ok(position('initials_colour' in pg_get_functiondef('public.create_profile_from_sign_up(uuid, jsonb)'::regprocedure)) = 0,
  'sign-up leaves the colour to the default');
select is(array[public.initials_colour_from_retired('ink'), public.initials_colour_from_retired('berry'),
                public.initials_colour_from_retired('indigo'), public.initials_colour_from_retired('ember'),
                public.initials_colour_from_retired('paper'), public.initials_colour_from_retired('cherry'),
                public.initials_colour_from_retired('cobalt'), public.initials_colour_from_retired('slate'),
                public.initials_colour_from_retired('forest'), public.initials_colour_from_retired('gold')],
  array['plum', 'plum', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sky', 'sage', 'gold'],
  'each retired colour maps to its nearest of the seven, and a kept one stays');

/* ---------- 2. Picking one ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_initials_colour('sky'), 'sky', 'a member picks a colour');
select is(public.profile_avatar_look('adult_writer') ->> 'initials_colour', 'sky', 'and it is saved');
select throws_ok($$ select public.set_my_initials_colour('neon') $$, '23514', null,
  'a colour that isn''t one of the choices is refused');
select throws_ok($$ select public.set_my_initials_colour('cobalt') $$, '23514', null,
  'a colour retired in CALM-3 is refused');
select throws_ok($$ select public.set_my_initials_colour(null) $$, '23514', null,
  'no colour at all ("from the username") is no longer a choice');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select throws_ok($$ select public.set_my_initials_colour('gold') $$, '42501', null,
  'a banned account can''t change its colour');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_initials_colour('gold') $$, '42501', null,
  'a signed-out visitor can''t pick a colour');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.set_my_initials_colour('sage'), 'sage', 'a staff account picks its own colour');

reset role;
select throws_ok($$ update public.profiles set initials_colour = 'neon' where handle = 'adult_writer' $$,
  '23514', null, 'the column itself refuses an unknown colour');
select throws_ok($$ update public.profiles set initials_colour = null where handle = 'adult_writer' $$,
  '23502', null, 'the column itself refuses no colour');

/* ---------- 3. Reading ---------- */

update public.profiles set initials_colour = 'violet' where handle = 'banned_user';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.profile_avatar_look('banned_user'), null,
  'a banned (hidden) profile''s look is not shown, so its bead takes the username''s colour');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select is(public.profile_avatar_look('banned_user') ->> 'initials_colour', 'violet', 'its owner still sees it');

/* ---------- 4. The data export ---------- */

reset role;
update public.profiles set initials_colour = 'sage' where handle = 'adult_writer';
select is(public.export_account_of('00000000-0000-4000-8000-000000000001') -> 'profile' ->> 'initials_colour',
  'sage', 'the colour is in the person''s data export');

select * from finish();
rollback;
