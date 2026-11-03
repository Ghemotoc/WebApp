-- Database tests for the avatar builder (bundle ADMIN-2, part g; Robert's brief of 2 Nov 2026,
-- section 7).
-- What it proves:
-- - only a recipe of the known shape is valid: the known keys, hex colours, plain part names;
-- - a member saves and clears their own recipe; an invalid one is refused; an account that may
--   not write, and a signed-out visitor, can't save one;
-- - anyone reads a profile's recipe; a banned (hidden) profile's recipe shows only to its owner;
-- - the recipe is in the person's data export;
-- (164-picture-check proves nobody can upload a profile picture any more.)
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- A fresh password sign-in, as Supabase's tokens carry it.
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- A recipe the builder could have made.
create function pg_temp.recipe() returns jsonb language sql as $$
  select '{"style": "open-peeps", "version": 1, "skin": "d08b5b", "head": "afro", "hairColour": "2c1b18",
           "expression": "smile", "facialHair": "none", "accessory": "glasses", "clothes": "8fa7df",
           "background": "f1eaf4"}'::jsonb;
$$;

/* ---------- 1. The shape ---------- */

select ok(public.avatar_recipe_valid(pg_temp.recipe()), 'a recipe the builder makes is valid');
select ok(public.avatar_recipe_valid(null), 'no recipe (the initials) is valid');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"extra": "x"}'), 'an extra key is refused');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() - 'skin'), 'a missing key is refused');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"skin": "red\"/><script>"}'),
  'a colour that isn''t six hex digits is refused, so no markup reaches the SVG');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"head": "<g onload=x>"}'),
  'a part name that isn''t a plain word is refused');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"style": "photo"}'), 'another style is refused');

/* ---------- 2. Saving one's own ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_avatar_recipe(pg_temp.recipe()), pg_temp.recipe(), 'a member saves their avatar');
select throws_ok($$ select public.set_my_avatar_recipe('{"style": "open-peeps"}') $$, '23514', null,
  'an invalid recipe is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select throws_ok($$ select public.set_my_avatar_recipe(pg_temp.recipe()) $$, '42501', null,
  'a banned account can''t change its avatar');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_avatar_recipe(pg_temp.recipe()) $$, '42501', null,
  'a signed-out visitor can''t save an avatar');

/* ---------- 3. Reading ---------- */

select is(public.profile_avatar_recipe('adult_writer') ->> 'head', 'afro', 'a signed-out visitor sees the avatar');
reset role;
update public.profiles set avatar_recipe = pg_temp.recipe() where handle = 'banned_user';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.profile_avatar_recipe('banned_user'), null, 'a banned (hidden) profile''s avatar is not shown');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select is(public.profile_avatar_recipe('banned_user') ->> 'head', 'afro', 'its owner still sees it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_avatar_recipe(null), null, 'a member goes back to the initials');
select is(public.profile_avatar_recipe('adult_writer'), null, 'and the initials show again');

/* ---------- 4. The data export and uploads ---------- */

reset role;
update public.profiles set avatar_recipe = pg_temp.recipe() where handle = 'adult_writer';
select is(public.export_account_of('00000000-0000-4000-8000-000000000001') -> 'profile' -> 'avatar_recipe',
  pg_temp.recipe(), 'the recipe is in the person''s data export');

select * from finish();
rollback;
