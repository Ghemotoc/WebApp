-- Database tests for the avatar builder (bundle ADMIN-2, part g; Robert's brief of 2 Nov 2026,
-- section 7; the Micah art since bundle AVATAR-1, 6 Nov 2026).
-- What it proves:
-- - only a recipe of the known shape is valid: the known keys, hex colours, plain part names;
-- - a member saves and clears their own recipe; an invalid one is refused; an account that may
--   not write, and a signed-out visitor, can't save one;
-- - every avatar saved in the old Open Peeps shape becomes a valid Micah one, keeping its colours;
-- - anyone reads a profile's recipe; a banned (hidden) profile's recipe shows only to its owner;
-- - the recipe is in the person's data export;
-- (164-picture-check proves nobody can upload a profile picture any more.)
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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
  select '{"style": "micah", "version": 1, "skin": "d08b5b", "hair": "full", "hairColour": "2c1b18",
           "eyebrows": "up", "eyes": "eyes", "mouth": "smile", "nose": "curve", "facialHair": "none",
           "glasses": "round", "earrings": "none", "extrasColour": "2c1b18", "shirt": "crew",
           "shirtColour": "8fa7df", "background": "f1eaf4"}'::jsonb;
$$;
-- A recipe saved before AVATAR-1, in the old Open Peeps shape.
create function pg_temp.old_recipe(head text, facial_hair text, accessory text) returns jsonb
language sql as $$
  select jsonb_build_object('style', 'open-peeps', 'version', 1, 'skin', 'ae5d29', 'head', head,
    'hairColour', 'c93305', 'expression', 'smile', 'facialHair', facial_hair, 'accessory', accessory,
    'clothes', 'e78276', 'background', 'd6e9dd');
$$;

/* ---------- 1. The shape ---------- */

select ok(public.avatar_recipe_valid(pg_temp.recipe()), 'a recipe the builder makes is valid');
select ok(public.avatar_recipe_valid(null), 'no recipe (the initials) is valid');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"extra": "x"}'), 'an extra key is refused');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() - 'skin'), 'a missing key is refused');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"skin": "red\"/><script>"}'),
  'a colour that isn''t six hex digits is refused, so no markup reaches the SVG');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"hair": "<g onload=x>"}'),
  'a part name that isn''t a plain word is refused');
select ok(not public.avatar_recipe_valid(pg_temp.recipe() || '{"style": "photo"}'), 'another style is refused');
select ok(not public.avatar_recipe_valid(pg_temp.old_recipe('afro', 'none', 'none')),
  'the old Open Peeps shape is no longer valid');

/* ---------- 1b. Moving the old avatars to the Micah art ---------- */

select ok(
  (select bool_and(public.avatar_recipe_valid(public.micah_recipe_from_open_peeps(
      pg_temp.old_recipe(head, facial_hair, accessory))))
   from unnest(array['afro', 'noHair1', 'mohawk', 'bangs', 'hijab', 'shortCombover', 'pomp', 'unknown']) as head,
        unnest(array['none', 'moustache2', 'full']) as facial_hair,
        unnest(array['none', 'glasses2', 'sunglasses', 'eyepatch']) as accessory),
  'every old avatar becomes a valid Micah one');
select is(public.micah_recipe_from_open_peeps(pg_temp.old_recipe('afro', 'moustache3', 'glasses4'))
    - array['eyebrows', 'eyes', 'mouth', 'nose', 'earrings', 'extrasColour', 'shirt', 'style', 'version'],
  '{"skin": "ae5d29", "hair": "full", "hairColour": "c93305", "facialHair": "scruff", "glasses": "round",
    "shirtColour": "e78276", "background": "d6e9dd"}'::jsonb,
  'the colours carry over and the closest hairstyle, facial hair and glasses are chosen');
select is(public.micah_recipe_from_open_peeps(pg_temp.old_recipe('noHair2', 'none', 'eyepatch')) ->> 'glasses',
  'none', 'an eyepatch, which Micah doesn''t have, becomes no glasses');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.micah_recipe_from_open_peeps('{}') $$, '42501', null,
  'members can''t call the conversion');
reset role;

/* ---------- 2. Saving one's own ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_avatar_recipe(pg_temp.recipe()), pg_temp.recipe(), 'a member saves their avatar');
select throws_ok($$ select public.set_my_avatar_recipe(pg_temp.old_recipe('afro', 'none', 'none')) $$, '23514', null,
  'an invalid recipe, such as one in the old shape, is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select throws_ok($$ select public.set_my_avatar_recipe(pg_temp.recipe()) $$, '42501', null,
  'a banned account can''t change its avatar');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_avatar_recipe(pg_temp.recipe()) $$, '42501', null,
  'a signed-out visitor can''t save an avatar');

/* ---------- 3. Reading ---------- */

select is(public.profile_avatar_recipe('adult_writer') ->> 'hair', 'full', 'a signed-out visitor sees the avatar');
reset role;
update public.profiles set avatar_recipe = pg_temp.recipe() where handle = 'banned_user';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.profile_avatar_recipe('banned_user'), null, 'a banned (hidden) profile''s avatar is not shown');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select is(public.profile_avatar_recipe('banned_user') ->> 'hair', 'full', 'its owner still sees it');

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
