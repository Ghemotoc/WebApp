-- Database tests for chapter planning in Story Atlas (stories S1-E17-23 to S1-E17-26 and the
-- "Appears in" half of S1-E17-12; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - every chapter gets its planning row through the trigger (S1-E17-24);
-- - the planning fields change by themselves, '' or null clears a choice, and unknown changes,
--   non-numbers, unknown types and characters of another story are refused;
-- - characters are marked present and not, and "Appears in" lists the chapters a character is
--   the point of view of or present in (S1-E17-12);
-- - the chapter list carries each chapter's words and target (S1-E17-26);
-- - scenes are added, changed, moved to any place with the others shifting, and deleted (S1-E17-25);
-- - policies chapter_plans_select_own, chapter_plan_characters_select_own and
--   chapter_scenes_select_own: allowed (the writer) and denied (another member, a moderator);
-- - deleting a character clears it from the plans; a purged chapter takes its plan and scenes;
--   no user ID in any answer.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member and writes
-- a story of their own; moderator (…10) is staff. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

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
-- The scene titles of chapter c194aaaa, in order.
create function pg_temp.scene_order() returns text language sql as $$
  select string_agg(scene ->> 'title', ',' order by (scene ->> 'position')::integer)
  from jsonb_array_elements(public.chapter_plan('c194aaaa') -> 'scenes') as scene;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

-- Two chapters and two characters for the writer; a story, chapter and character for teacher.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count)
values ('19400000-0000-4000-8000-0000000000a1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'c194aaaa', 1, 'Furtuna', 'Unu doi trei.', 3),
       ('19400000-0000-4000-8000-0000000000a2', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'c194bbbb', 2, 'Calmul', 'Patru.', 1);
insert into public.story_characters (id, story_id, user_id, name)
values ('19400000-0000-4000-8000-0000000000c1', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Ana'),
       ('19400000-0000-4000-8000-0000000000c2', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Bogdan');
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating)
values ('19400000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 't194-alta',
  'Alta', 'Alta.', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body)
values ('19400000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 'c194tttt', 1, 'Alt', 'Alt.');
insert into public.story_characters (id, story_id, user_id, name)
values ('19400000-0000-4000-8000-0000000000c9', '19400000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000007', 'Tudor');

/* ---------- 1. Every chapter has its plan (S1-E17-24) ---------- */

select is((select count(*)::integer from public.chapter_plans
           where chapter_id in ('19400000-0000-4000-8000-0000000000a1', '19400000-0000-4000-8000-0000000000a2')), 2,
  'a new chapter gets its planning row through the trigger');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select kind || ':' || planning_status from public.chapter_plans
           where chapter_id = '19400000-0000-4000-8000-0000000000a1'), 'chapter:idea',
  'allowed: chapter_plans_select_own: the writer reads their chapter''s plan, a chapter at the idea stage');

/* ---------- 2. Changing the plan ---------- */

select public.update_chapter_plan('c194aaaa', jsonb_build_object(
  'kind', 'prologue', 'planning_status', 'drafting', 'word_target', 3000, 'world_date', '  Primăvara, anul 3 ',
  'world_sort', 3.5, 'location', 'Farul', 'summary', 'Furtuna loveşte farul.',
  'pov_character_id', '19400000-0000-4000-8000-0000000000c1',
  'act_id', (select id from public.story_plan_acts where story_id = '00000000-0000-4000-9000-000000000001' and position = 1)));
select is((public.chapter_plan('c194aaaa') -> 'plan') - 'updated_at'::text - 'act_id'::text, jsonb_build_object(
    'kind', 'prologue', 'planning_status', 'drafting', 'word_target', 3000, 'world_date', 'Primăvara, anul 3',
    'world_sort', 3.5, 'location', 'Farul', 'summary', 'Furtuna lovește farul.',
    'pov_character_id', '19400000-0000-4000-8000-0000000000c1', 'pov_is_narrator', false),
  'each field saves, texts trimmed and ş corrected to ș');
select is((public.chapter_plan('c194aaaa') -> 'plan' ->> 'act_id')::uuid,
  (select id from public.story_plan_acts where story_id = '00000000-0000-4000-9000-000000000001' and position = 1),
  'the chapter is in the act picked');
select public.update_chapter_plan('c194aaaa', '{"word_target": null, "act_id": ""}');
select is(public.chapter_plan('c194aaaa') -> 'plan' -> 'word_target', 'null'::jsonb,
  'null clears the word target');
select is(public.chapter_plan('c194aaaa') -> 'plan' -> 'act_id', 'null'::jsonb, 'an empty act clears it');
select is(pg_temp.refusal($$ select public.update_chapter_plan('c194aaaa', '{"published_title": "x"}') $$),
  '23514:unknown_change', 'an unknown change is refused');
select is(pg_temp.refusal($$ select public.update_chapter_plan('c194aaaa', '{"word_target": "mult"}') $$),
  '23514:bad_number', 'a word target that isn''t a number is refused');
select is(pg_temp.refusal($$ select public.update_chapter_plan('c194aaaa', '{"kind": "ending"}') $$),
  '23514', 'a chapter type that isn''t one of the four is refused');
select is(pg_temp.refusal($$ select public.update_chapter_plan('c194aaaa',
  '{"pov_character_id": "19400000-0000-4000-8000-0000000000c9"}') $$),
  '23514:other_story', 'a point of view from another writer''s story is refused');

/* ---------- 3. Characters present and "Appears in" (S1-E17-12) ---------- */

select public.set_chapter_character_present('c194aaaa', '19400000-0000-4000-8000-0000000000c1', true);
select public.set_chapter_character_present('c194aaaa', '19400000-0000-4000-8000-0000000000c2', true);
select public.set_chapter_character_present('c194aaaa', '19400000-0000-4000-8000-0000000000c2', false);
select is((select count(*)::integer from public.chapter_plan_characters
           where chapter_id = '19400000-0000-4000-8000-0000000000a1'), 1,
  'allowed: chapter_plan_characters_select_own: a character marked and unmarked leaves only the one still present');
select public.update_chapter_plan('c194bbbb', '{"pov_character_id": "19400000-0000-4000-8000-0000000000c1"}');
select is(public.character_appearances('19400000-0000-4000-8000-0000000000c1') -> 'chapters', jsonb_build_array(
    jsonb_build_object('code', 'c194aaaa', 'position', 1, 'title', 'Furtuna', 'is_pov', true, 'is_present', true),
    jsonb_build_object('code', 'c194bbbb', 'position', 2, 'title', 'Calmul', 'is_pov', true, 'is_present', false)),
  '"Appears in" lists the chapters a character is the point of view of or present in, in order');
select is(jsonb_array_length(public.character_appearances('19400000-0000-4000-8000-0000000000c2') -> 'chapters'), 0,
  'a character no longer present appears nowhere');

/* ---------- 4. The chapter list (S1-E17-26) ---------- */

select public.update_chapter_plan('c194bbbb', '{"word_target": 2500}');
select is((select string_agg(chapter ->> 'code' || ':' || (chapter ->> 'word_count') || '/' || coalesce(chapter ->> 'word_target', '-'), ',')
           from jsonb_array_elements(public.story_chapter_progress('statia-meteo-seed01') -> 'chapters') as chapter),
  'c194aaaa:3/-,c194bbbb:1/2500', 'the chapter list carries each chapter''s words and target, in order');

/* ---------- 5. Scenes (S1-E17-25) ---------- */

insert into named select 'first', (public.add_chapter_scene('c194aaaa', 'Sosirea') ->> 'id')::uuid;
insert into named select 'second', (public.add_chapter_scene('c194aaaa', 'Cina') ->> 'id')::uuid;
insert into named select 'third', (public.add_chapter_scene('c194aaaa', ' Plecarea ') ->> 'id')::uuid;
select is(pg_temp.scene_order(), 'Sosirea,Cina,Plecarea',
  'allowed: chapter_scenes_select_own: new scenes go at the end, their titles trimmed');
select public.move_chapter_scene((select id from named where label = 'third'), 1);
select is(pg_temp.scene_order(), 'Plecarea,Sosirea,Cina', 'moving a scene earlier shifts the others down');
select public.move_chapter_scene((select id from named where label = 'third'), 99);
select is(pg_temp.scene_order(), 'Sosirea,Cina,Plecarea', 'moving past the end puts it last');
select public.update_chapter_scene((select id from named where label = 'second'), jsonb_build_object(
  'title', 'Cina lungă', 'status', 'outlined', 'summary', 'Toți tac.', 'pov_character_id', '19400000-0000-4000-8000-0000000000c2'));
select is((select title || ':' || status || ':' || summary || ':' || pov_character_id from public.chapter_scenes
           where id = (select id from named where label = 'second')),
  'Cina lungă:outlined:Toți tac.:19400000-0000-4000-8000-0000000000c2', 'a scene''s title, status, summary and point of view save');
select is(pg_temp.refusal(format($$ select public.update_chapter_scene(%L, '{"title": "  "}') $$,
  (select id from named where label = 'second'))), '23514', 'a scene needs a title');
select public.delete_chapter_scene((select id from named where label = 'first'));
select is(pg_temp.scene_order(), 'Cina lungă,Plecarea', 'deleting a scene closes the gap');

/* ---------- 6. Other people ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.chapter_plans where story_id = '00000000-0000-4000-9000-000000000001'), 0,
  'denied: chapter_plans_select_own: another member reads none of the writer''s chapter plans');
select is((select count(*)::integer from public.chapter_plan_characters where story_id = '00000000-0000-4000-9000-000000000001'), 0,
  'denied: chapter_plan_characters_select_own: another member reads none of who is present in the writer''s chapters');
select is(public.update_chapter_plan('c194aaaa', '{"summary": "Al meu"}') ->> 'outcome', 'not_found',
  'another member can''t change the writer''s chapter plan');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.chapter_plans) + (select count(*)::integer from public.chapter_scenes), 0,
  'denied: chapter_scenes_select_own: a moderator reads no scenes, and no chapter plans, through the app');
reset role;
set local role anon;
select is(pg_temp.refusal($$ select public.chapter_plan('c194aaaa') $$), '42501',
  'signed out, nobody can read a chapter plan');

/* ---------- 7. Characters and chapters going ---------- */

reset role;
delete from public.story_characters where id = '19400000-0000-4000-8000-0000000000c1';
select is((select coalesce(pov_character_id::text, 'none') || ':' ||
             (select count(*) from public.chapter_plan_characters where chapter_id = '19400000-0000-4000-8000-0000000000a1')
           from public.chapter_plans where chapter_id = '19400000-0000-4000-8000-0000000000a1'), 'none:0',
  'deleting a character clears it as point of view and as present');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(public.chapter_plan('c194aaaa')::text !~ '00000000-0000-4000-8000-000000000001',
  'chapter_plan() never carries the writer''s user ID (rule 15)');
reset role;
delete from public.chapters where id = '19400000-0000-4000-8000-0000000000a1';
select is((select count(*)::integer from public.chapter_plans where chapter_id = '19400000-0000-4000-8000-0000000000a1')
  + (select count(*)::integer from public.chapter_scenes where chapter_id = '19400000-0000-4000-8000-0000000000a1'), 0,
  'a purged chapter takes its plan and scenes with it');

select * from finish();

rollback;
