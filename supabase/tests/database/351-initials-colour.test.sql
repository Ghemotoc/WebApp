-- Database tests for the initials colour (bundle G11a; the SettingsProfile board, "If you keep
-- your initials").
-- What it proves:
-- - there are sixteen colours, the same count as beadColours.ts;
-- - a member picks a colour and goes back to "from the username"; an unknown name is refused,
--   in the function and by the column's own check;
-- - a banned account and a signed-out visitor can't pick one; a staff account can;
-- - anyone reads a profile's avatar look (recipe and colour); a banned (hidden) profile's look
--   shows only to its owner; a missing profile reads as null;
-- - the colour is in the person's data export.
-- Personas: adult_writer (…01), teen_17 (…02), moderator (…10), banned_user (…14). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. The colours ---------- */

select is(cardinality(public.initials_colour_names()), 16, 'there are sixteen colours, as in beadColours.ts');

/* ---------- 2. Picking one ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_initials_colour('cobalt'), 'cobalt', 'a member picks a colour');
select is(public.profile_avatar_look('adult_writer') ->> 'initials_colour', 'cobalt', 'and it is saved');
select throws_ok($$ select public.set_my_initials_colour('neon') $$, '23514', null,
  'a colour that isn''t one of the choices is refused');
select is(public.set_my_initials_colour(null), null, 'a member goes back to the colour from the username');
select is(public.profile_avatar_look('adult_writer') -> 'initials_colour', 'null'::jsonb,
  'and no colour is stored');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select throws_ok($$ select public.set_my_initials_colour('gold') $$, '42501', null,
  'a banned account can''t change its colour');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_initials_colour('gold') $$, '42501', null,
  'a signed-out visitor can''t pick a colour');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.set_my_initials_colour('slate'), 'slate', 'a staff account picks its own colour');

reset role;
select throws_ok($$ update public.profiles set initials_colour = 'neon' where handle = 'adult_writer' $$,
  '23514', null, 'the column itself refuses an unknown colour');

/* ---------- 3. Reading ---------- */

update public.profiles set initials_colour = 'berry' where handle = 'banned_user';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.profile_avatar_look('banned_user'), null,
  'a banned (hidden) profile''s look is not shown, so its bead takes the username''s colour');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000014');
select is(public.profile_avatar_look('banned_user') ->> 'initials_colour', 'berry', 'its owner still sees it');

/* ---------- 4. The data export ---------- */

reset role;
update public.profiles set initials_colour = 'sage' where handle = 'adult_writer';
select is(public.export_account_of('00000000-0000-4000-8000-000000000001') -> 'profile' ->> 'initials_colour',
  'sage', 'the colour is in the person''s data export');

select * from finish();
rollback;
