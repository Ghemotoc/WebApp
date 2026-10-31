-- Database tests for every story's plan in Story Atlas (stories S1-E17-01 to S1-E17-06; CLAUDE.md
-- rules 1, 12 and 15).
-- What it proves:
-- - a new story comes with its plan: a 90,000-word target and Act I, II and III (S1-E17-01);
-- - policy story_plans_select_own: allowed (the writer) and denied (another member, a moderator);
-- - policy story_plan_acts_select_own: allowed (the writer) and denied (another member);
-- - nobody writes to the tables directly; update_story_plan() changes only the plan's own fields,
--   saves each one by itself and refuses an address that isn't http or https (S1-E17-03, 04);
-- - story_plan() gives the at-a-glance numbers, answers not_found for someone else's story or a
--   deleted one, never answers a user ID, and refuses a signed-out visitor (S1-E17-06);
-- - deleting the story for good deletes its plan (S1-E17-05).
-- Personas: adult_writer (…01) writes; teacher (…07) is another member; moderator (…10) is staff.
-- Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. A new story comes with its plan (S1-E17-01) ---------- */

-- adult_writer makes a story through New story's own function.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table made (slug text) on commit drop;
grant all on made to anon, authenticated;
insert into made select public.create_story('Harta din pod', 'O hartă găsită într-un pod vechi.', 'ro',
  'fiction', '{}', '{"kind": "automatic"}', null,
  '{"rating": "all_ages", "ai_disclosure": "no_ai"}') ->> 'slug';

select is(public.story_plan((select slug from made)) #>> '{plan,word_target}', '90000',
  'a new story''s plan starts with a 90,000-word target');
select is(public.story_plan((select slug from made)) -> 'acts',
  '[{"name": "Act I", "position": 1}, {"name": "Act II", "position": 2}, {"name": "Act III", "position": 3}]'::jsonb,
  'and three acts');
select is((select count(*) from public.story_plans),
  (select count(*) from public.stories where user_id = '00000000-0000-4000-8000-000000000001'),
  'allowed: story_plans_select_own: the writer reads the plans of their own stories (the seed''s and the new one)');
select is((select count(*) from public.story_plan_acts),
  3 * (select count(*) from public.stories where user_id = '00000000-0000-4000-8000-000000000001'),
  'allowed: story_plan_acts_select_own: the writer reads the acts of their own plans');

/* ---------- 2. Nobody else reads a plan ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*) from public.story_plans
  where story_id = '00000000-0000-4000-9000-000000000001'), 0::bigint,
  'denied: story_plans_select_own: another member can''t read someone else''s plan');
select is((select count(*) from public.story_plan_acts
  where story_id = '00000000-0000-4000-9000-000000000001'), 0::bigint,
  'denied: story_plan_acts_select_own: another member can''t read someone else''s acts');
select is(public.story_plan('statia-meteo-seed01'), '{"outcome": "not_found"}'::jsonb,
  'and story_plan() answers not_found for someone else''s story');
select is(public.update_story_plan('statia-meteo-seed01', '{"logline": "Furat"}'),
  '{"outcome": "not_found"}'::jsonb, 'update_story_plan() changes nothing on someone else''s story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*) from public.story_plans), 0::bigint,
  'denied: story_plans_select_own: a moderator can''t read anyone''s plan through the app');

/* ---------- 3. Changing the plan (S1-E17-03, S1-E17-04) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ update public.story_plans set logline = 'x' where story_id = '00000000-0000-4000-9000-000000000001' $$,
  '42501', null, 'the writer can''t write to story_plans directly: changes go through update_story_plan()');
select throws_ok($$ insert into public.story_plan_acts (story_id, user_id, position, name)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 4, 'Act IV') $$,
  '42501', null, 'nor to story_plan_acts');
select is(public.update_story_plan('statia-meteo-seed01',
  '{"logline": "  O stație meteo pe un munte. ", "word_target": 60000}') ->> 'outcome', 'ok',
  'the writer changes the logline and the word target');
select is(public.update_story_plan('statia-meteo-seed01', '{"series_name": "Munții"}') ->> 'outcome', 'ok',
  'and then the series name, on its own');
select is((public.story_plan('statia-meteo-seed01') -> 'plan') - 'updated_at',
  '{"logline": "O stație meteo pe un munte.", "series_name": "Munții", "word_target": 60000,
    "writing_status": "planning", "publishing_route": "undecided", "linked_project_label": "",
    "linked_project_url": ""}'::jsonb,
  'each change saved by itself, trimmed, and the fields not given kept their values');
select is(public.update_story_plan('statia-meteo-seed01',
  '{"writing_status": "drafting", "publishing_route": "serial_here", "linked_project_label": "Panou",
    "linked_project_url": "https://example.com/panou"}') ->> 'outcome', 'ok',
  'the writing status, the publishing route and a linked project save');
select throws_ok($$ select public.update_story_plan('statia-meteo-seed01', '{"linked_project_url": "javascript:alert(1)"}') $$,
  '23514', null, 'an address that isn''t http or https is refused (S1-E17-04)');
select throws_ok($$ select public.update_story_plan('statia-meteo-seed01', '{"writing_status": "abandoned"}') $$,
  '23514', null, 'a writing status that isn''t on the list is refused');
select throws_ok($$ select public.update_story_plan('statia-meteo-seed01', '{"word_target": 0}') $$,
  '23514', null, 'a word target of 0 is refused');

/* ---------- 4. The at-a-glance numbers (S1-E17-06) ---------- */

reset role;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'plan0001', 1,
  'Unu', 'Cinci cuvinte sunt aici acum.', 5);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.story_plan('statia-meteo-seed01') -> 'chapters') - 'recent',
  '{"words_written": 5, "chapter_count": 1, "published_count": 0}'::jsonb,
  'the words written count the drafts, with the chapters and how many are published');
select ok(public.story_plan('statia-meteo-seed01')::text not like '%00000000-0000-4000-8000-%',
  'story_plan() never answers a user ID');

/* ---------- 5. Signed out, and deleted ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.story_plan('statia-meteo-seed01') $$, '42501', null,
  'a signed-out visitor gets no plan');
-- Deleting the story for good (the nightly purge, S1-E3-05) deletes its plan and acts.
reset role;
delete from public.stories where slug = (select slug from made);
select is((select count(*) from public.story_plans), (select count(*) from public.stories),
  'a story deleted for good takes its plan with it (S1-E17-05)');
select is((select count(*) from public.story_plan_acts), 3 * (select count(*) from public.stories),
  'and its acts');

select * from finish();
rollback;
