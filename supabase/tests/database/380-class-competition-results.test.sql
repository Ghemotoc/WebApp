-- Database tests for class competition results and criteria templates (bundle CLASS-POINTS,
-- part 2; stories S1-E8-15 and S1-E8-19; Robert, 13 Nov 2026).
-- What it proves:
-- - after the end the teacher scores entrants per criterion, sees class points and teacher points
--   as a guide with no rank, and confirms exactly one Winner and any Finalists; everyone else who
--   joined is a Contestant; a pupil who didn't join gets nothing; the app never names a Winner;
-- - the entrant with the most class points who isn't the Winner is "Readers' choice"; ties share;
-- - results lock the competition and the entrants' teacher points, go to the class's log, and the
--   Winner is told first, then the class;
-- - the class sees one Winner card with a pen name and the winning chapter, no score or total;
--   an entrant reads only their own result;
-- - below the 8th grade there is no Winner, Finalist or Readers' choice;
-- - a competition is reportable by its class and stops showing once our moderators hide it;
-- - a teacher's templates are their own: saved, renamed, deleted, never read by anyone else;
-- - leaving the class and the 30-day purge delete entries, scores and results;
-- - each table policy has an allowed and a denied test (CLAUDE.md rule 1).
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), teacher (…07), moderator (…10),
-- blocker (…15, outside the class). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(67);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint a statement raises, or null when it runs.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Minors take part in a class, so this test runs with the age gate on (as in tests 232 to 234).
update public.feature_flags set is_enabled = false where key = 'adults_only';

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;
-- A value kept earlier, as text and as an ID.
create function pg_temp.kept(wanted text) returns text language sql as $$
  select value from kept where name = wanted $$;
create function pg_temp.kept_id(wanted text) returns uuid language sql as $$
  select value::uuid from kept where name = wanted $$;
-- Today where class weeks are counted.
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Europe/Bucharest')::date $$;
-- Two good criteria, as the competition form sends them.
create function pg_temp.criteria() returns jsonb language sql as $$
  select '[{"label": "Limbaj", "max_points": 10, "description": "Cum folosește limba.",
            "outcomes": ["Folosește dialogul ca să arate un personaj", "Cel mult cinci greșeli de ortografie"]},
           {"label": "Poveste", "max_points": 20, "description": "Cum e construită povestea.",
            "outcomes": ["Are început, mijloc și sfârșit"]}]'::jsonb $$;
-- A competition's details from today for a week, with the criteria given.
create function pg_temp.details(name text, criteria jsonb) returns jsonb language sql as $$
  select jsonb_build_object('name', name, 'starts_on', pg_temp.today(),
                            'ends_on', pg_temp.today() + 7, 'criteria', criteria) $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The SQLSTATE a statement raises, or null when it runs.
create function pg_temp.state_of(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. A 9th grade class, three pupils, two chapters, class points ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a IX-a D', 'Atelier de scris.');
insert into kept select 'code', public.make_class_invite('clasa-a-ix-a-d', 30, 10) ->> 'code';
select public.set_class_points('clasa-a-ix-a-d', true);
select public.set_class_grade('clasa-a-ix-a-d', 9);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code'));
select public.create_story('Caietul verde', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c2a01',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_space(pg_temp.kept('code'));
select public.create_story('Jurnal de vară', 'Pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c2a02',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.as_postgres();
insert into kept select 'space', id::text from public.spaces where slug = 'clasa-a-ix-a-d';
insert into kept select 'kid_slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000c2a01';
insert into kept select 'teen_slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000c2a02';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
insert into kept select 'kid_code', public.create_chapter(pg_temp.kept('kid_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('kid_code'), 'Începutul', 'Prima zi de școală.', 1);
select public.publish_chapter(pg_temp.kept('kid_code'));
select public.set_story_class(pg_temp.kept('kid_slug'), 'clasa-a-ix-a-d');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
insert into kept select 'teen_code', public.create_chapter(pg_temp.kept('teen_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('teen_code'), 'Iunie', 'Soare.', 1);
select public.publish_chapter(pg_temp.kept('teen_code'));
select public.set_story_class(pg_temp.kept('teen_slug'), 'clasa-a-ix-a-d');
select pg_temp.as_postgres();
insert into kept select 'kid_chapter', id::text from public.chapters where code = pg_temp.kept('kid_code');
insert into kept select 'teen_chapter', id::text from public.chapters where code = pg_temp.kept('teen_code');

-- The competition; the kid and the teen join, adult_writer doesn't.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'competition', public.save_class_competition('clasa-a-ix-a-d',
  pg_temp.details('Concursul de vară', pg_temp.criteria())) -> 'running' ->> 'id';
select pg_temp.as_postgres();
insert into kept select 'criterion_1', id::text from public.class_competition_criteria
  where competition_id = pg_temp.kept_id('competition') and position = 1;
insert into kept select 'criterion_2', id::text from public.class_competition_criteria
  where competition_id = pg_temp.kept_id('competition') and position = 2;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_competition(pg_temp.kept_id('competition'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_competition(pg_temp.kept_id('competition'));

-- Class points during the competition: the kid's chapter gets 5, the teen's 1.
select pg_temp.as_postgres();
insert into public.class_point_gifts (user_id, space_id, chapter_id, receiver_user_id, week_start, points) values
  ('00000000-0000-4000-8000-000000000002', pg_temp.kept_id('space'), pg_temp.kept_id('kid_chapter'),
   '00000000-0000-4000-8000-000000000003', public.class_points_week_start(), 3),
  ('00000000-0000-4000-8000-000000000001', pg_temp.kept_id('space'), pg_temp.kept_id('kid_chapter'),
   '00000000-0000-4000-8000-000000000003', public.class_points_week_start(), 2),
  ('00000000-0000-4000-8000-000000000003', pg_temp.kept_id('space'), pg_temp.kept_id('teen_chapter'),
   '00000000-0000-4000-8000-000000000002', public.class_points_week_start(), 1);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.set_teacher_points('chapter', pg_temp.kept_id('teen_chapter'), 8);
select public.end_class_competition(pg_temp.kept_id('competition'));

/* ---------- 2. Scoring: the teacher's own marks, with the points as a guide ---------- */

select is(jsonb_array_length(public.class_competition_scoring(pg_temp.kept_id('competition')) -> 'entrants'), 2,
  'only the pupils who joined are on the scoring page');
select is(public.class_competition_scoring(pg_temp.kept_id('competition')) -> 'entrants' -> 0 ->> 'handle', 'kid_14_ok',
  'entrants are listed by name, never by points');
select is(public.class_competition_scoring(pg_temp.kept_id('competition')) -> 'entrants' -> 0 ->> 'class_points', '5',
  'the teacher sees an entrant''s class points as a guide');
select is(public.class_competition_scoring(pg_temp.kept_id('competition')) -> 'entrants' -> 1 ->> 'teacher_points', '8',
  'and their teacher points');
select ok(not (public.class_competition_scoring(pg_temp.kept_id('competition'))::text ~ 'rank|suggest|giver|0000-4000-8000'),
  'the scoring page has no rank, no suggestion, no giver and no user ID');
select is(public.save_class_competition_scores(pg_temp.kept_id('competition'), 'teen_17',
    jsonb_build_object(pg_temp.kept('criterion_1'), 9, pg_temp.kept('criterion_2'), 18)) ->> pg_temp.kept('criterion_2'),
  '18', 'the teacher scores an entrant on each criterion');
select is(pg_temp.hint_of(format($$select public.save_class_competition_scores(%L, 'teen_17', %L)$$,
    pg_temp.kept('competition'), jsonb_build_object(pg_temp.kept('criterion_1'), 11))), 'score:range',
  'a score can''t pass the criterion''s maximum');
select is(pg_temp.hint_of(format($$select public.save_class_competition_scores(%L, 'teen_17', %L)$$,
    pg_temp.kept('competition'), jsonb_build_object(gen_random_uuid()::text, 1))), 'score:criterion',
  'nor be for another competition''s criterion');
select is(pg_temp.hint_of(format($$select public.save_class_competition_scores(%L, 'adult_writer', %L)$$,
    pg_temp.kept('competition'), jsonb_build_object(pg_temp.kept('criterion_1'), 1))), 'competition:not_entrant',
  'a pupil who didn''t join gets no score');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of(format($$select public.save_class_competition_scores(%L, 'teen_17', %L)$$,
    pg_temp.kept('competition'), jsonb_build_object(pg_temp.kept('criterion_1'), 10))), 'competition:missing',
  'a pupil can''t score anyone');

/* ---------- 3. Confirming the results: the teacher decides ---------- */

select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{"winner": "teen_17"}')$$,
    pg_temp.kept('competition'))), 'competition:missing', 'a pupil can''t confirm results');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{}')$$, pg_temp.kept('competition'))),
  'competition:winner', 'the app never names a Winner: the teacher must');
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{"winner": "adult_writer"}')$$,
    pg_temp.kept('competition'))), 'competition:not_entrant', 'only a pupil who joined can win');
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{"winner": "teen_17", "finalists": ["teen_17"]}')$$,
    pg_temp.kept('competition'))), 'competition:twice', 'a pupil has one result');
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{"winner": "teen_17", "finalists": ["kid_14_ok"]}')$$,
    pg_temp.kept('competition'))), 'competition:unscored', 'a Finalist needs a score on every criterion');
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, %L)$$, pg_temp.kept('competition'),
    jsonb_build_object('winner', 'teen_17', 'winning_chapter_id', pg_temp.kept('kid_chapter')))), 'competition:chapter',
  'the winning chapter must be one of the Winner''s');
select public.save_class_competition_scores(pg_temp.kept_id('competition'), 'kid_14_ok',
  jsonb_build_object(pg_temp.kept('criterion_1'), 9, pg_temp.kept('criterion_2'), 18));
-- Both entrants now have the same criteria total: the teacher still decides.
select is(public.publish_class_competition(pg_temp.kept_id('competition'),
    jsonb_build_object('winner', 'teen_17', 'winning_chapter_id', pg_temp.kept('teen_chapter'),
                       'finalists', jsonb_build_array('kid_14_ok'))) -> 'running', 'null'::jsonb,
  'the teacher confirms one Winner and a Finalist, even on equal totals');
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{"winner": "kid_14_ok"}')$$,
    pg_temp.kept('competition'))), 'competition:not_judging', 'results are confirmed once; the competition is locked');
select is(pg_temp.hint_of(format($$select public.save_class_competition_scores(%L, 'kid_14_ok', %L)$$,
    pg_temp.kept('competition'), jsonb_build_object(pg_temp.kept('criterion_1'), 1))), 'competition:not_judging',
  'scores are locked too');
select is(pg_temp.hint_of(format($$select public.delete_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:published', 'published results can''t be deleted');
select is(pg_temp.hint_of(format($$select public.set_teacher_points('chapter', %L, 2)$$, pg_temp.kept('teen_chapter'))),
  'points:locked', 'teacher points on an entrant''s work lock with the results');
select pg_temp.as_postgres();
select is((select array_agg(result::text || ':' || readers_choice::text order by pupil_user_id)
           from public.class_competition_results), array['winner:false', 'finalist:true'],
  'the entrant with the most class points who isn''t the Winner is Readers'' choice');
select is((select count(*)::integer from public.class_competition_results
           where pupil_user_id = '00000000-0000-4000-8000-000000000001'), 0,
  'a pupil who didn''t join has no result');
select is((select details -> 'entrants' -> 0 -> 'scores' ->> 'Poveste' from public.space_moderation_log
           where action = 'competition_published'), '18', 'results and criteria scores are in the class''s log');
select is((select array_agg(kind::text || ' to ' || right(user_id::text, 2) order by kind::text) from public.notifications
           where kind in ('class_competition_won', 'class_readers_choice', 'class_competition_results')),
  array['class_competition_results to 01', 'class_competition_won to 02', 'class_readers_choice to 03'],
  'the Winner, the Readers'' choice and the rest of the class are each told once');
select is((select count(*)::integer from public.notifications
           where kind = 'class_competition_results' and user_id = '00000000-0000-4000-8000-000000000007'), 0,
  'the teacher isn''t told about their own results');

/* ---------- 4. What the class sees: one Winner card, pen names only ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.class_competitions('clasa-a-ix-a-d') -> 'published' -> 0 ->> 'winner',
  'teen_17', 'a classmate sees the Winner''s name as the class knows it');
select is(public.class_competitions('clasa-a-ix-a-d') -> 'published' -> 0 -> 'winning_chapter' ->> 'title', 'Iunie',
  'and the winning chapter');
select is(jsonb_array_length(public.class_competitions('clasa-a-ix-a-d') -> 'published' -> 0 -> 'readers_choice'), 1,
  'and the Readers'' choice pen name');
select is(public.class_competitions('clasa-a-ix-a-d') -> 'published' -> 0 -> 'my_result', 'null'::jsonb,
  'a pupil who didn''t join has no result of their own');
select ok(not (public.class_competitions('clasa-a-ix-a-d')::text ~ 'finalist|points|score|0000-4000-8000'),
  'the card has no other result, no points, no score and no user ID');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_competitions('clasa-a-ix-a-d') -> 'published' -> 0 ->> 'my_result', 'finalist',
  'an entrant reads their own result');
select is(public.class_competitions('clasa-a-ix-a-d') -> 'published' -> 0 ->> 'my_readers_choice', 'true',
  'and that they are the Readers'' choice');

/* ---------- 5. Each results policy: allowed and denied (CLAUDE.md rule 1) ---------- */

select is((select count(*)::integer from public.class_competition_results), 0,
  'class_competition_results_select_own denies: a pupil reads no result from the table, not even their own');
select is((select count(*)::integer from public.class_competition_scores), 0,
  'class_competition_scores_select_own denies: and no score');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.class_competition_results), 2,
  'class_competition_results_select_own allows: the teacher reads the results they confirmed');
select is((select count(*)::integer from public.class_competition_scores), 4,
  'class_competition_scores_select_own allows: and the scores they gave');

/* ---------- 6. A competition is reportable, and hidden once our moderators hide it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.state_of(format($$select * from public.report_item('class_competition', %L, 'harassment')$$,
    pg_temp.kept('competition'))), '23514', 'someone outside the class can''t report, or reach, its competition');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select lives_ok(format($$select * from public.report_item('class_competition', %L, 'harassment')$$,
    pg_temp.kept('competition')), 'a pupil of the class can report its competition');
select pg_temp.as_postgres();
select is(public.reportable_item_summary('class_competition', pg_temp.kept_id('competition')),
  'Class competition "Concursul de vară" in the class "Clasa a IX-a D"', 'the moderation queue says what it is');
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000007', 'class_competition', pg_temp.kept_id('competition'), 'hidden',
        '00000000-0000-4000-8000-000000000010', 'Test.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(jsonb_array_length(public.class_competitions('clasa-a-ix-a-d') -> 'published'), 0,
  'a hidden competition stops showing to the class');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(jsonb_array_length(public.class_competitions('clasa-a-ix-a-d') -> 'published'), 1,
  'its teacher still sees it');
select pg_temp.as_postgres();
delete from public.moderated_items where item_type = 'class_competition';

/* ---------- 7. A teacher's own criteria templates (S1-E8-19) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.my_criteria_templates(), '[]'::jsonb, 'we ship no ready-made templates');
insert into kept select 'template', public.save_criteria_template('  Proză   scurtă ', pg_temp.criteria()) -> 0 ->> 'id';
select is(public.my_criteria_templates() -> 0 ->> 'name', 'Proză scurtă', 'the teacher saves criteria as a template');
select is(public.my_criteria_templates() -> 0 -> 'criteria' -> 0 -> 'outcomes' ->> 0,
  'Folosește dialogul ca să arate un personaj', 'with the outcomes');
select is(pg_temp.hint_of(format($$select public.save_criteria_template('proză scurtă', %L)$$, pg_temp.criteria())),
  'template:name_taken', 'two templates can''t share a name');
select is(pg_temp.hint_of($$select public.save_criteria_template('Gol', '[]')$$), 'criteria:count',
  'a template follows the same rules as a competition''s criteria');
select is(public.save_criteria_template('Proză', pg_temp.criteria() - 0, pg_temp.kept_id('template')) -> 0 ->> 'name',
  'Proză', 'the teacher renames and edits a template');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.class_competition_criteria
           where competition_id = pg_temp.kept_id('competition')), 2,
  'a competition already made doesn''t change with the template');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.class_criteria_templates), 1,
  'class_criteria_templates_select_own allows: the teacher reads their template');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.class_criteria_templates), 0,
  'class_criteria_templates_select_own denies: nobody else does, staff included');
select is(public.my_criteria_templates(), '[]'::jsonb, 'another person''s list is empty');
select is(pg_temp.hint_of(format($$select public.save_criteria_template('Furat', %L, %L)$$,
    pg_temp.criteria(), pg_temp.kept('template'))), 'template:not_teacher', 'someone who teaches no class has no templates to change');
select is(pg_temp.hint_of(format($$select public.delete_criteria_template(%L)$$, pg_temp.kept('template'))),
  'template:missing', 'or deletes it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.delete_criteria_template(pg_temp.kept_id('template')), '[]'::jsonb, 'the teacher deletes a template');

/* ---------- 8. Below the 8th grade: no Winner, no Finalist, no Readers' choice ---------- */

select public.create_class_space('Clasa a VI-a', 'Atelier.');
insert into kept select 'code_6', public.make_class_invite('clasa-a-vi-a', 30, 10) ->> 'code';
select public.set_class_points('clasa-a-vi-a', true);
select is(public.set_class_grade('clasa-a-vi-a', 6) ->> 'winners_allowed', 'false', 'the 6th grade has no Winner');
insert into kept select 'competition_6', public.save_class_competition('clasa-a-vi-a',
  pg_temp.details('Concursul mic', pg_temp.criteria())) -> 'running' ->> 'id';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code_6'));
select public.join_class_competition(pg_temp.kept_id('competition_6'));
select pg_temp.as_postgres();
insert into public.class_point_gifts (user_id, space_id, chapter_id, receiver_user_id, week_start, points)
select '00000000-0000-4000-8000-000000000015', id, pg_temp.kept_id('kid_chapter'),
       '00000000-0000-4000-8000-000000000003', public.class_points_week_start(), 3
from public.spaces where slug = 'clasa-a-vi-a';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.end_class_competition(pg_temp.kept_id('competition_6'));
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{"winner": "kid_14_ok"}')$$,
    pg_temp.kept('competition_6'))), 'competition:no_winners', 'below the 8th grade nobody is Winner');
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{"finalists": ["kid_14_ok"]}')$$,
    pg_temp.kept('competition_6'))), 'competition:no_winners', 'or Finalist');
select is(public.publish_class_competition(pg_temp.kept_id('competition_6'), '{}') -> 'published' -> 0 -> 'winner',
  'null'::jsonb, 'the results are published with no Winner');
select pg_temp.as_postgres();
select is((select result::text || ':' || readers_choice::text from public.class_competition_results
           where competition_id = pg_temp.kept_id('competition_6')), 'participant:false',
  'every entrant is a Contestant, and there is no Readers'' choice either');

/* ---------- 9. A competition nobody joined, and a class with points off ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'competition_2', public.save_class_competition('clasa-a-ix-a-d',
  pg_temp.details('Concursul de iarnă', pg_temp.criteria())) -> 'running' ->> 'id';
select public.end_class_competition(pg_temp.kept_id('competition_2'));
select is(pg_temp.hint_of(format($$select public.publish_class_competition(%L, '{}')$$, pg_temp.kept('competition_2'))),
  'competition:no_entrants', 'a competition nobody joined has no results');
select public.delete_class_competition(pg_temp.kept_id('competition_2'));

/* ---------- 10. Leaving the class, download and deletion lists, and the 30-day purge ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.leave_space('clasa-a-ix-a-d');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.class_competition_results as results
           where results.competition_id = pg_temp.kept_id('competition')
             and results.pupil_user_id = '00000000-0000-4000-8000-000000000003')
        + (select count(*)::integer from public.class_competition_scores as scores
           where scores.competition_id = pg_temp.kept_id('competition')
             and scores.pupil_user_id = '00000000-0000-4000-8000-000000000003')
        + (select count(*)::integer from public.class_competition_entrants as entrants
           where entrants.competition_id = pg_temp.kept_id('competition')
             and entrants.user_id = '00000000-0000-4000-8000-000000000003'), 0,
  'a pupil who leaves the class takes their entry, scores and result with them');
select is((select count(*)::integer from public.data_export_tables()
           where table_name like 'class_competition%' or table_name = 'class_criteria_templates'), 6,
  'the six tables are in Download my data');
select is((select count(*)::integer from public.account_deletion_rules()
           where (table_name like 'class_competition%' or table_name = 'class_criteria_templates')
             and action = 'delete'), 6, 'and are deleted with the account');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.archive_class_space('clasa-a-ix-a-d');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.class_competitions where space_id = pg_temp.kept_id('space')), 1,
  'right after archiving the competition is still there');
update public.spaces set archived_at = now() - interval '31 days' where slug = 'clasa-a-ix-a-d';
select ok(public.purge_class_points() > 0, '30 days after archiving the purge runs');
select is((select count(*)::integer from public.class_competitions where space_id = pg_temp.kept_id('space'))
        + (select count(*)::integer from public.class_competition_results
           where competition_id = pg_temp.kept_id('competition')), 0,
  'and the competition, its scores and its results are deleted');

select * from finish();
rollback;
