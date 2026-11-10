-- Database tests for the Narrator as a chapter's point of view (bundle G10 ATLAS, part c2;
-- CLAUDE.md rule 1).
-- What it proves:
-- - a writer sets the Narrator, and chapter_plan() and story_storyline() return it;
-- - one teller at a time: the Narrator clears the character, a character takes the Narrator off,
--   and asking for both at once is refused;
-- - a Narrator that isn't true or false is refused;
-- - another writer can't set it and a visitor can't call the function.
-- Personas: adult_writer (…01, owns the seed story …9000-…01), teen_17 (…02).
-- Test data: one chapter and one character in adult_writer's story; rolled back.
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
-- "narrator", "character" or "nobody": who tells chapter c321aaaa, read from the table.
create function pg_temp.teller() returns text language sql as $$
  select case when pov_is_narrator then 'narrator' when pov_character_id is not null then 'character'
              else 'nobody' end
  from public.chapter_plans where chapter_id = '32100000-0000-4000-8000-0000000000a1';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count)
values ('32100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'c321aaaa', 1, 'Furtuna', 'Unu doi trei.', 3);
insert into public.story_characters (id, story_id, user_id, name)
values ('32100000-0000-4000-8000-0000000000c1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Ana');

/* ---------- 1. Setting the Narrator ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

select is((public.chapter_plan('c321aaaa') -> 'plan' ->> 'pov_is_narrator')::boolean, false,
  'a new chapter is not told by the Narrator');
select is(public.update_chapter_plan('c321aaaa', '{"pov_is_narrator": true}'::jsonb) ->> 'outcome', 'ok',
  'a writer sets the Narrator as the point of view');
select is((public.chapter_plan('c321aaaa') -> 'plan' ->> 'pov_is_narrator')::boolean, true,
  'chapter_plan() returns the Narrator');
select is(
  (select (chapter ->> 'pov_is_narrator')::boolean
   from jsonb_array_elements(public.story_storyline(
     (select slug from public.stories where id = '00000000-0000-4000-9000-000000000001')) -> 'chapters') as chapter
   where chapter ->> 'code' = 'c321aaaa'),
  true, 'story_storyline() returns the Narrator, for the board and the lanes');

/* ---------- 2. One teller at a time ---------- */

select public.update_chapter_plan('c321aaaa',
  '{"pov_character_id": "32100000-0000-4000-8000-0000000000c1"}'::jsonb);
select is(pg_temp.teller(), 'character', 'picking a character takes the Narrator off');
select public.update_chapter_plan('c321aaaa', '{"pov_is_narrator": true}'::jsonb);
select is(pg_temp.teller(), 'narrator', 'picking the Narrator clears the character');
select is(pg_temp.refusal($$ select public.update_chapter_plan('c321aaaa',
  '{"pov_is_narrator": true, "pov_character_id": "32100000-0000-4000-8000-0000000000c1"}'::jsonb) $$),
  '23514', 'a chapter told by both a character and the Narrator is refused');
select is(pg_temp.refusal($$ select public.update_chapter_plan('c321aaaa',
  '{"pov_is_narrator": "yes"}'::jsonb) $$),
  '23514:bad_narrator', 'a Narrator that isn''t true or false is refused');

/* ---------- 3. Nobody else ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.update_chapter_plan('c321aaaa', '{"pov_is_narrator": false}'::jsonb) ->> 'outcome',
  'not_found', 'another writer can''t change who tells the chapter');

reset role;
set local role anon;
select is(pg_temp.refusal($$ select public.update_chapter_plan('c321aaaa',
  '{"pov_is_narrator": false}'::jsonb) $$), '42501',
  'a visitor can''t change who tells a chapter');

select * from finish();
rollback;
