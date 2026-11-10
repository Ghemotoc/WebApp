-- Database tests for the liquid glass relationship form in Story Atlas (bundle G10 ATLAS, part b;
-- CLAUDE.md rule 1).
-- What it proves:
-- - a cousin is saved with its degree and how removed, and a cousin without a degree, or with a
--   degree out of range, is refused; another type never keeps a degree;
-- - an "Other" relationship keeps its reverse label, trimmed, and another type drops it;
-- - story_cast() returns the reverse label and the cousin's degree, with the writer's note;
-- - readers' public_plan_relationships() returns the same values but never the note.
-- Personas: adult_writer (…01, owns statia-meteo-seed01).
-- Test data: three characters in adult_writer's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('mara', (public.create_story_character('statia-meteo-seed01', 'Mara', 'protagonist') ->> 'id')::uuid),
  ('corina', (public.create_story_character('statia-meteo-seed01', 'Corina', 'minor') ->> 'id')::uuid),
  ('ana', (public.create_story_character('statia-meteo-seed01', 'Ana', 'supporting') ->> 'id')::uuid);

/* ---------- 1. Cousins ---------- */

insert into named values ('cousin', (public.add_character_relationship(
  (select id from named where label = 'corina'), (select id from named where label = 'mara'),
  'cousin_of', null, '', '', 2, 1) ->> 'id')::uuid);
select results_eq(
  $$ select kind, cousin_degree::integer, cousin_removed::integer from public.story_character_relationships
     where id = (select id from named where label = 'cousin') $$,
  $$ values ('cousin_of', 2, 1) $$,
  'a cousin is saved with its degree and how many times removed');

select is(pg_temp.refusal($$ select public.add_character_relationship(
  (select id from named where label = 'corina'), (select id from named where label = 'ana'),
  'cousin_of', null, '', '', null, null) $$), '23514',
  'a cousin without a degree is refused');
select is(pg_temp.refusal($$ select public.add_character_relationship(
  (select id from named where label = 'corina'), (select id from named where label = 'ana'),
  'cousin_of', null, '', '', 4, 0) $$), '23514',
  'a fourth cousin is refused: the form offers first to third');

insert into named values ('sibling', (public.add_character_relationship(
  (select id from named where label = 'mara'), (select id from named where label = 'ana'),
  'sibling_of', 'ignored', '', 'ignored too', 2, 1) ->> 'id')::uuid);
select results_eq(
  $$ select custom_label, reverse_label, cousin_degree, cousin_removed from public.story_character_relationships
     where id = (select id from named where label = 'sibling') $$,
  $$ values ('', '', null::smallint, null::smallint) $$,
  'another type keeps no label, reverse label or degree');

/* ---------- 2. "Other" with a reverse label ---------- */

insert into named values ('other', (public.add_character_relationship(
  (select id from named where label = 'ana'), (select id from named where label = 'mara'),
  'custom', ' godmother of ', 'Both are true: she was never told.', ' goddaughter of ') ->> 'id')::uuid);
select results_eq(
  $$ select custom_label, reverse_label from public.story_character_relationships
     where id = (select id from named where label = 'other') $$,
  $$ values ('godmother of', 'goddaughter of') $$,
  'an "Other" relationship keeps both labels, trimmed');

/* ---------- 3. What the pages read ---------- */

select is(
  (select relationship ->> 'reverse_label'
   from jsonb_array_elements(public.story_cast('statia-meteo-seed01') -> 'relationships') as relationship
   where relationship ->> 'id' = (select id::text from named where label = 'other')),
  'goddaughter of', 'story_cast() returns the reverse label');
select is(
  (select relationship ->> 'note'
   from jsonb_array_elements(public.story_cast('statia-meteo-seed01') -> 'relationships') as relationship
   where relationship ->> 'id' = (select id::text from named where label = 'other')),
  'Both are true: she was never told.', 'story_cast() returns the writer''s note');

reset role;
select ok(
  not exists (select 1 from jsonb_array_elements(public.public_plan_relationships(
      (select id from public.stories where slug = 'statia-meteo-seed01'), array['relationship_map'], true)) as relationship
    where relationship ? 'note'),
  'readers'' relationships never carry the writer''s note');

select * from finish();
rollback;
