-- Database tests for what the liquid glass Story Atlas pages read (bundle G10 ATLAS, part a;
-- CLAUDE.md rule 1).
-- What it proves:
-- - a character's sheet takes the new one-line summary, and the at-a-glance plan lists the
--   characters edited last with their role and that line;
-- - the at-a-glance plan's recent chapters carry their publishing status and planning status;
-- - my_story_plans() lists the writer's own live stories with the plan's fields and the words
--   written, never another writer's, and a visitor can't call it.
-- Personas: adult_writer (…01, owns statia-meteo-seed01), teen_17 (…02).
-- Test data: one character and one chapter in adult_writer's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table kept (label text primary key, id uuid, code text) on commit drop;
grant all on kept to authenticated;

/* ---------- 1. The character in a line ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into kept (label, id)
values ('mara', (public.create_story_character('statia-meteo-seed01', 'Mara', 'protagonist') ->> 'id')::uuid);

select is(
  public.update_story_character((select id from kept where label = 'mara'),
    '{"sheet": {"summary": "13, sings alto, counts everything"}}'::jsonb) ->> 'outcome',
  'ok',
  'a writer can give a character a one-line summary');

select results_eq(
  $$ select recent ->> 'name', recent ->> 'role', recent ->> 'summary'
     from jsonb_array_elements(public.story_plan('statia-meteo-seed01') -> 'cast' -> 'recent') as recent $$,
  $$ values ('Mara', 'protagonist', '13, sings alto, counts everything') $$,
  'the at-a-glance plan lists the character edited last with the role and the line');

/* ---------- 2. Recent chapters with their status ---------- */

insert into kept (label, code)
values ('chapter', public.create_chapter('statia-meteo-seed01') ->> 'code');
select public.save_chapter_draft((select code from kept where label = 'chapter'), 'Dimineața',
  'Bunica notează vremea în fiecare dimineață.', 1);

select results_eq(
  $$ select recent ->> 'status', recent ? 'planning_status', recent ? 'published_at', recent ? 'scheduled_for'
     from jsonb_array_elements(public.story_plan('statia-meteo-seed01') -> 'chapters' -> 'recent') as recent $$,
  $$ values ('draft', true, true, true) $$,
  'a recent chapter carries its publishing status, its dates and its planning status');

/* ---------- 3. The list of story plans ---------- */

select ok(
  exists (select 1 from jsonb_array_elements(public.my_story_plans()) as plan_row
          where plan_row ->> 'slug' = 'statia-meteo-seed01'
            and plan_row ->> 'writing_status' = 'planning'
            and (plan_row ->> 'word_target')::int > 0),
  'a writer''s list of story plans holds their story with its writing status and word target');

select ok(
  (select (plan_row ->> 'words_written')::int > 0
   from jsonb_array_elements(public.my_story_plans()) as plan_row
   where plan_row ->> 'slug' = 'statia-meteo-seed01'),
  'the list counts the words written in the story''s chapters');

select ok(
  not exists (select 1 from jsonb_array_elements(public.my_story_plans()) as plan_row
              where not (plan_row ? 'slug' and plan_row ? 'logline') or plan_row ? 'user_id'),
  'each row has the slug and logline and never a user ID');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(
  not exists (select 1 from jsonb_array_elements(public.my_story_plans()) as plan_row
              where plan_row ->> 'slug' = 'statia-meteo-seed01'),
  'another writer never sees adult_writer''s story in their list of plans');

reset role;
set local role anon;
select throws_ok('select public.my_story_plans()', '42501', null,
  'a visitor can''t read anyone''s list of story plans');

select * from finish();
rollback;
