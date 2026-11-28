-- Database tests for a play's cast (LAYOUTS-2; Robert, 27 Nov 2026, 17:34 UTC; board D14).
-- What it proves:
-- - a story starts with an empty cast;
-- - only the writer changes it: another member gets 'not_found', a visitor is refused;
-- - the shape is checked: too many characters, an empty or long name, a long note, the same
--   name twice (ignoring capitals) and an entry that isn't {name, note} are each refused, and a
--   refused cast leaves the old one as it was;
-- - names and notes are stored trimmed and in the writer's order, a missing note as '';
-- - the writer reads their cast back through the stories table (their own row).
-- No new table or policy: stories' policies are tested elsewhere; set_story_cast() checks the
-- owner itself (allowed: the writer; denied: another member and a visitor).
-- Personas: adult_writer (…01, the seed stories' writer), teacher (…07, another member).
-- Test data: the seed story 'the-girl-who-fixed-radios-seed02'; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

/* ---------- 1. The start, and who may change it ---------- */

select is((select play_cast from public.stories where slug = 'the-girl-who-fixed-radios-seed02'),
  '[]'::jsonb, 'a story starts with an empty cast');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02', '[{"name": "Ana", "note": ""}]'),
  'not_found', 'another member can''t change someone else''s cast');
select pg_temp.sign_out();
select throws_ok(
  $$select public.set_story_cast('the-girl-who-fixed-radios-seed02', '[{"name": "Ana", "note": ""}]')$$,
  '42501', null, 'a visitor who isn''t signed in can''t change a cast');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02',
    '[{"name": "  Mara ", "note": " sings alto, sixteen "}, {"name": "Teo"}]'),
  'ok', 'the writer sets their story''s cast');
select is((select play_cast from public.stories where slug = 'the-girl-who-fixed-radios-seed02'),
  '[{"name": "Mara", "note": "sings alto, sixteen"}, {"name": "Teo", "note": ""}]'::jsonb,
  'names and notes are trimmed, kept in order, and a missing note is empty');
select is(public.set_story_cast('no-such-story', '[]'), 'not_found',
  'a story that doesn''t exist answers not_found');

/* ---------- 2. The shape ---------- */

select is(public.set_story_cast('the-girl-who-fixed-radios-seed02',
    (select jsonb_agg(jsonb_build_object('name', 'Name ' || place)) from generate_series(1, 61) as place)),
  'too_many', 'more than 60 characters is refused');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02', '[{"name": "   "}]'),
  'bad_name', 'an empty name is refused');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02',
    jsonb_build_array(jsonb_build_object('name', repeat('a', 41)))),
  'bad_name', 'a name over 40 characters is refused');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02',
    jsonb_build_array(jsonb_build_object('name', 'Mara', 'note', repeat('a', 81)))),
  'bad_note', 'a note over 80 characters is refused');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02',
    '[{"name": "Mara"}, {"name": "MARA "}]'),
  'duplicate_name', 'the same name twice, in other capitals, is refused');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02', '[{"name": 7}]'),
  'bad_entry', 'an entry whose name isn''t text is refused');
select is(public.set_story_cast('the-girl-who-fixed-radios-seed02', '{"name": "Mara"}'),
  'not_a_list', 'a cast that isn''t a list is refused');
select is((select jsonb_array_length(play_cast) from public.stories
           where slug = 'the-girl-who-fixed-radios-seed02'), 2,
  'a refused cast leaves the old one as it was');

select * from finish();
rollback;
