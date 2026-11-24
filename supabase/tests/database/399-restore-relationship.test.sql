-- Database tests for Undo after deleting a relationship (design books item 14, "Undo").
-- What it proves:
-- - delete_character_relationship() hands back the removed row without user_id or story_id;
-- - restore_character_relationship() puts it back with the same id, note and "Keep private";
-- - a second restore changes nothing; the same relationship added again meanwhile is refused;
-- - another member can't restore it into the writer's story, nor can a visitor;
-- - a relationship whose character was deleted meanwhile can't come back.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member.
-- Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

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

create temporary table named (label text primary key, id uuid, removed jsonb) on commit drop;
grant all on named to anon, authenticated;

-- adult_writer's cast: Ana and Vali, a private "parent of" with a note.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named (label, id) values
  ('ana', (public.create_story_character('statia-meteo-seed01', 'Ana', 'protagonist') ->> 'id')::uuid),
  ('vali', (public.create_story_character('statia-meteo-seed01', 'Vali', 'supporting') ->> 'id')::uuid);
insert into named (label, id) values
  ('parent', (public.add_character_relationship((select id from named where label = 'ana'),
     (select id from named where label = 'vali'), 'parent_of', null, 'Îl crește singură.') ->> 'id')::uuid);
select public.set_plan_item_privacy((select id from named where label = 'parent'), true);

/* ---------- 1. The delete hands the row back ---------- */

update named set removed = public.delete_character_relationship((select id from named where label = 'parent')) -> 'relationship'
where label = 'parent';
select is((select removed ->> 'id' from named where label = 'parent'),
  (select id::text from named where label = 'parent'), 'the delete hands back the removed row');
select ok((select not (removed ? 'user_id') and not (removed ? 'story_id') from named where label = 'parent'),
  'without the owner''s id or the story''s id');

/* ---------- 2. Others can't put it back ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.restore_character_relationship((select removed from named where label = 'parent')) ->> 'outcome',
  'not_found', 'denied: another member can''t restore it into the writer''s story');
set local role anon;
select is(pg_temp.refusal($$ select public.restore_character_relationship('{}'::jsonb) $$), '42501',
  'denied: a visitor can''t call it');

/* ---------- 3. The writer's Undo ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.restore_character_relationship((select removed from named where label = 'parent')) ->> 'outcome',
  'ok', 'allowed: the writer puts it back');
select is((select row(id, note, is_private)::text from public.story_character_relationships
           where id = (select id from named where label = 'parent')),
  row((select id from named where label = 'parent'), 'Îl crește singură.', true)::text,
  'with the same id, note and "Keep private"');
select is(public.restore_character_relationship((select removed from named where label = 'parent')) ->> 'outcome',
  'ok', 'a second Undo changes nothing');
select is((select count(*)::integer from public.story_character_relationships
           where from_character_id = (select id from named where label = 'ana')), 1,
  'and leaves one relationship');

-- Deleted again, then the same relationship added by hand: Undo is refused as a duplicate.
select public.delete_character_relationship((select id from named where label = 'parent'));
select public.add_character_relationship((select id from named where label = 'ana'),
  (select id from named where label = 'vali'), 'parent_of', null, '');
select is(pg_temp.refusal(format('select public.restore_character_relationship(%L::jsonb)',
    (select removed from named where label = 'parent'))), '23514:already_there',
  'the same relationship added again meanwhile is refused');

-- A character deleted meanwhile: the relationship can't come back.
select public.delete_story_character((select id from named where label = 'vali'));
select is(public.restore_character_relationship((select removed from named where label = 'parent')) ->> 'outcome',
  'not_found', 'a relationship whose character is gone can''t come back');

select * from finish();
rollback;
