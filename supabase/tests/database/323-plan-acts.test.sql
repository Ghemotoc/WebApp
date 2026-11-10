-- Database tests for adding, renaming and deleting the acts of a story's plan (bundle GAPS-2a;
-- CLAUDE.md rule 1).
-- What it proves:
-- - a writer adds an act after the others and story_storyline() lists it, with its name trimmed;
-- - an empty name is refused, and so is a 13th act;
-- - a writer renames an act; an act of no such ID is not found;
-- - an act never takes another act's name, capitals aside, though it may change its own capitals
--   (break test, 10 Nov 2026);
-- - deleting an act moves its chapters to "No act" and deletes no chapter;
-- - another writer can't add, rename or delete and a visitor can't call the functions.
-- Personas: adult_writer (…01, owns the seed story …9000-…01), teen_17 (…02).
-- Test data: acts and one draft chapter in adult_writer's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

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
-- The seed story's address, and the names of its acts in order as story_storyline() gives them.
create function pg_temp.slug() returns text language sql as $$
  select slug from public.stories where id = '00000000-0000-4000-9000-000000000001';
$$;
create function pg_temp.act_names() returns text language sql as $$
  select string_agg(act ->> 'name', ', ' order by (act ->> 'position')::integer)
  from jsonb_array_elements(public.story_storyline(pg_temp.slug()) -> 'acts') as act;
$$;
create function pg_temp.act_id(act_name text) returns text language sql as $$
  select act ->> 'id'
  from jsonb_array_elements(public.story_storyline(pg_temp.slug()) -> 'acts') as act
  where act ->> 'name' = act_name;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
-- Where the test keeps the code of the chapter it adds.
create temporary table added_chapter (code text) on commit drop;
grant select, insert on added_chapter to authenticated;

/* ---------- 1. Adding an act ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

select is(pg_temp.act_names(), 'Act I, Act II, Act III', 'a story starts with three acts');
select is(public.add_plan_act(pg_temp.slug(), '  Epilogue ') ->> 'outcome', 'ok', 'a writer adds an act');
select is(pg_temp.act_names(), 'Act I, Act II, Act III, Epilogue',
  'the new act comes after the others, its name trimmed');
select is(pg_temp.refusal(format('select public.add_plan_act(%L, %L)', pg_temp.slug(), '   ')), '23514',
  'an act with an empty name is refused');
select is(pg_temp.refusal(format('select public.add_plan_act(%L, %L)', pg_temp.slug(), ' act ii ')),
  '23514:name_taken', 'an act with another act''s name is refused, capitals aside');

/* ---------- 2. Renaming an act ---------- */

select is(public.rename_plan_act(pg_temp.slug(), pg_temp.act_id('Epilogue'), 'Aftermath') ->> 'outcome', 'ok',
  'a writer renames an act');
select is(pg_temp.act_names(), 'Act I, Act II, Act III, Aftermath', 'the act carries its new name');
select is(public.rename_plan_act(pg_temp.slug(), '00000000-0000-4000-8000-00000000ffff', 'Nothing') ->> 'outcome',
  'not_found', 'an act the story does not have is not found');
select is(pg_temp.refusal(format('select public.rename_plan_act(%L, %L, %L)',
    pg_temp.slug(), pg_temp.act_id('Aftermath'), 'ACT III')),
  '23514:name_taken', 'an act can''t take another act''s name');
select is(public.rename_plan_act(pg_temp.slug(), pg_temp.act_id('Aftermath'), 'AFTERMATH') ->> 'outcome', 'ok',
  'an act may change its own capitals');

/* ---------- 3. Deleting an act ---------- */

-- A chapter added to Act I (add_chapter_to_act(), S1-E17-19), so the act has a chapter to move.
insert into added_chapter
  select public.add_chapter_to_act(pg_temp.slug(), pg_temp.act_id('Act I')) ->> 'code';
select is(public.delete_plan_act(pg_temp.slug(), pg_temp.act_id('Act I')),
  jsonb_build_object('outcome', 'ok', 'chapters_moved', 1),
  'a writer deletes an act and hears how many chapters moved');
select is(pg_temp.act_names(), 'Act II, Act III, AFTERMATH', 'the act is gone');
select is((select count(*) from jsonb_array_elements(public.story_storyline(pg_temp.slug()) -> 'chapters') as chapter
           where chapter ->> 'code' = (select code from added_chapter) and chapter ->> 'act_id' is null),
  1::bigint, 'its chapter is still in the book, under "No act"');

/* ---------- 4. At most 12 acts ---------- */

select public.add_plan_act(pg_temp.slug(), 'Extra ' || number) from generate_series(1, 9) as number;
select is(pg_temp.refusal(format('select public.add_plan_act(%L, %L)', pg_temp.slug(), 'One too many')),
  '23514:too_many_acts', 'a 13th act is refused');

/* ---------- 5. Somebody else and visitors ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');

select is(public.add_plan_act(pg_temp.slug(), 'Mine now') ->> 'outcome', 'not_found',
  'another writer can''t add an act to the story');
select is(public.rename_plan_act(pg_temp.slug(), (select id::text from public.story_plan_acts limit 1), 'Mine') ->> 'outcome',
  'not_found', 'another writer can''t rename an act');
select is(public.delete_plan_act(pg_temp.slug(), '00000000-0000-4000-8000-00000000ffff') ->> 'outcome',
  'not_found', 'another writer can''t delete an act');

select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);

select is(pg_temp.refusal($$select public.add_plan_act('a-story', 'Visitor')$$), '42501',
  'a visitor can''t add an act');
select is(pg_temp.refusal($$select public.delete_plan_act('a-story', 'x')$$), '42501',
  'a visitor can''t delete an act');

select * from finish();
rollback;
