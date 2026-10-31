-- Database tests for relationships between characters in Story Atlas (stories S1-E17-14 to
-- S1-E17-16, and S1-E17-13's "their relationships go with them"; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - a writer records a relationship between two of their characters, with a type and a note,
--   and a custom one with their own label; story_cast() returns it for the sheets, the map and
--   the tree (S1-E17-14);
-- - the same character twice, an unknown type, a custom one without a label, two stories'
--   characters and someone else's characters are refused;
-- - policy story_character_relationships_select_own: allowed (the writer) and denied (another
--   member, a moderator);
-- - deleting a relationship needs the writer; deleting a character deletes its relationships.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member and writes
-- a story of their own; moderator (…10) is staff. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The SQLSTATE a statement raises, or null; with the hint when there is one.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  error_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics error_hint = pg_exception_hint;
  return sqlstate || coalesce(':' || nullif(error_hint, ''), '');
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

-- adult_writer's cast: Ana, her son Vali and the vampire Ștefan who turned him.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('ana', (public.create_story_character('statia-meteo-seed01', 'Ana', 'protagonist') ->> 'id')::uuid),
  ('vali', (public.create_story_character('statia-meteo-seed01', 'Vali', 'supporting') ->> 'id')::uuid),
  ('stefan', (public.create_story_character('statia-meteo-seed01', 'Ștefan', 'antagonist') ->> 'id')::uuid);
-- teacher's character in a story of their own.
reset role;
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating)
values ('19200000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 't192-alta',
  'Alta', 'Alta.', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named values ('other', (public.create_story_character('t192-alta', 'Altcineva', 'minor') ->> 'id')::uuid);

/* ---------- 1. Recording relationships (S1-E17-14) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('parent', (public.add_character_relationship((select id from named where label = 'ana'),
     (select id from named where label = 'vali'), 'parent_of', null, ' Îl crește singură. ') ->> 'id')::uuid),
  ('made', (public.add_character_relationship((select id from named where label = 'stefan'),
     (select id from named where label = 'vali'), 'made', null, null) ->> 'id')::uuid),
  ('custom', (public.add_character_relationship((select id from named where label = 'vali'),
     (select id from named where label = 'stefan'), 'custom', 'îi datorează viața', '') ->> 'id')::uuid);
select is((select count(*)::integer from public.story_character_relationships), 3,
  'allowed: story_character_relationships_select_own: the writer reads the relationships they recorded');
select is((public.story_cast('statia-meteo-seed01') -> 'relationships' -> 0) - 'id',
  jsonb_build_object('from', (select id from named where label = 'ana'), 'to', (select id from named where label = 'vali'),
    'kind', 'parent_of', 'custom_label', '', 'note', 'Îl crește singură.'),
  'story_cast() returns each relationship, read from the first character to the second, the note trimmed');
select is(public.story_cast('statia-meteo-seed01') #>> '{relationships,2,custom_label}', 'îi datorează viața',
  'a custom relationship keeps the writer''s own label');

select is(pg_temp.refusal($$ select public.add_character_relationship((select id from named where label = 'ana'),
  (select id from named where label = 'ana'), 'loves', null, null) $$), '23514',
  'a character can''t be related to themselves');
select is(pg_temp.refusal($$ select public.add_character_relationship((select id from named where label = 'ana'),
  (select id from named where label = 'vali'), 'godparent_of', null, null) $$), '23514',
  'a type that isn''t on the list is refused');
select is(pg_temp.refusal($$ select public.add_character_relationship((select id from named where label = 'ana'),
  (select id from named where label = 'vali'), 'custom', '  ', null) $$), '23514',
  'a custom relationship needs its label');
select is(public.add_character_relationship((select id from named where label = 'ana'),
  (select id from named where label = 'other'), 'loves', null, null), '{"outcome": "not_found"}'::jsonb,
  'nobody can link their character to someone else''s');

/* ---------- 2. Nobody else reads or changes them ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.story_character_relationships
           where story_id = '00000000-0000-4000-9000-000000000001'), 0,
  'denied: story_character_relationships_select_own: another member can''t read someone else''s relationships');
select is(public.delete_character_relationship((select id from named where label = 'parent')),
  '{"outcome": "not_found"}'::jsonb, 'nor delete one');
select throws_ok($$ insert into public.story_character_relationships (story_id, user_id, from_character_id, to_character_id, kind)
    values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000007',
      (select id from named where label = 'ana'), (select id from named where label = 'vali'), 'loves') $$,
  '42501', null, 'nobody writes to the table directly');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.story_character_relationships), 0,
  'denied: story_character_relationships_select_own: a moderator can''t read them through the app either');

/* ---------- 3. Deleting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.delete_character_relationship((select id from named where label = 'parent')) ->> 'outcome', 'ok',
  'the writer deletes a relationship');
select is((select count(*)::integer from public.story_character_relationships), 2, 'and it is gone');
select is(public.delete_story_character((select id from named where label = 'stefan')) ->> 'outcome', 'ok',
  'deleting Ștefan …');
select is((select count(*)::integer from public.story_character_relationships), 0,
  '… deletes his relationships, both ways (S1-E17-13)');

select * from finish();
rollback;
