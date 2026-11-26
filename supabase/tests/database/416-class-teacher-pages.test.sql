-- Database tests for the teacher's class pages (bundle BOOKS-8, part 8b; boards G07 to G12, user
-- stories 8.7 to 8.10).
-- What it proves:
-- - a teacher makes a class with its grade and school; a grade outside 1 to 13 is refused; the
--   old two-argument call still works; someone without the badge can't;
-- - the teacher changes the school; a pupil can't; an empty name is refused;
-- - the teacher's summary has this week's totals for the whole class, and a pupil's has none;
-- - the teacher's table counts each pupil's notes;
-- - the teacher reports one pupil's points with a reason; a pupil can't, an unknown reason is
--   refused, and the class log gets one line;
-- - the teacher sees how many notes a chapter got and whether its teacher points are locked;
-- - once a competition the writer entered is published, the chapter's teacher points can't
--   change or be removed, while deleting the class still works.
-- No table or policy is added (the trigger guards an existing table), so there is no new policy
-- to test. Personas: adult_writer (…01, no badge), teen_17 (…02), kid_14_ok (…03), teacher (…07).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

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

-- Minors take part in a class, so this test runs with the age gate on (as in test 377).
update public.feature_flags set is_enabled = false where key = 'adults_only';

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;
create function pg_temp.kept(wanted text) returns text language sql as $$
  select value from kept where name = wanted $$;
create function pg_temp.kept_id(wanted text) returns uuid language sql as $$
  select value::uuid from kept where name = wanted $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Making a class with its grade and school (G07) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.create_class_space('Clasa a IX-a B', 'Atelier de scris.', '', 'plum', 9,
            'Liceul Teoretic din Ploiești') ->> 'slug',
          'clasa-a-ix-a-b', 'a teacher makes a class with its grade and school');
select pg_temp.as_postgres();
select is((select class_grade::integer from public.spaces where slug = 'clasa-a-ix-a-b'), 9,
          'the class keeps its grade');
select is((select school_name from public.spaces where slug = 'clasa-a-ix-a-b'), 'Liceul Teoretic din Ploiești',
          'the class keeps its school');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.create_class_space('Clasa greșită', 'x', '', 'plum', 14, 'Școala')$$),
          'grade:range', 'a grade outside 1 to 13 is refused');
select ok(public.create_class_space('Clasa veche', 'Fără an.') ->> 'slug' is not null,
          'the older call with a name and a description still works');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of($$select public.create_class_space('Clasa mea', 'x', '', 'plum', 9, 'Școala')$$),
          'space:not_teacher', 'someone without a Teacher badge can''t make a class');

/* ---------- 2. Changing the school (G08 class settings) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'code', public.make_class_invite('clasa-a-ix-a-b', 30, 10) ->> 'code';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_space(pg_temp.kept('code'));

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_class_school('clasa-a-ix-a-b', '  Colegiul Național  ') ->> 'school_name',
          'Colegiul Național', 'the teacher changes the school, trimmed');
select is(pg_temp.hint_of($$select public.set_class_school('clasa-a-ix-a-b', '   ')$$),
          'school:length', 'an empty school name is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select isnt(pg_temp.hint_of($$select public.set_class_school('clasa-a-ix-a-b', 'Alta')$$), null,
            'a pupil can''t change the school');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.space_moderation_log as log
           join public.spaces on spaces.id = log.space_id
           where spaces.slug = 'clasa-a-ix-a-b' and log.action = 'class_school_set'), 1,
          'the class log records the new school once');

/* ---------- 3. Points, notes and this week's totals (G08, G09) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.set_class_points('clasa-a-ix-a-b', true);

-- kid_14_ok shares a story with one chapter; teen_17 opens it and gives 2 points with a note.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.create_story('Strada mea', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000b8b11',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.as_postgres();
insert into kept select 'slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000b8b11';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
insert into kept select 'chapter_code', public.create_chapter(pg_temp.kept('slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('chapter_code'), 'La șapte', 'Brutăria respiră prima.', 1);
select public.publish_chapter(pg_temp.kept('chapter_code'));
select public.set_story_class(pg_temp.kept('slug'), 'clasa-a-ix-a-b');
select pg_temp.as_postgres();
insert into kept select 'chapter', id::text from public.chapters where code = pg_temp.kept('chapter_code');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.class_chapter_points(pg_temp.kept_id('chapter'));
select public.give_class_points(pg_temp.kept_id('chapter'), 2, 'Un început frumos.');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.class_points_summary('clasa-a-ix-a-b') -> 'week',
          '{"given": 2, "notes": 1, "possible": 20, "reported": 0, "chapters_shared": 1}'::jsonb,
          'the teacher sees this week''s totals for the whole class');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_points_summary('clasa-a-ix-a-b') -> 'week', 'null'::jsonb,
          'a pupil gets no class totals');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select pupil ->> 'notes' from jsonb_array_elements(public.class_points_table('clasa-a-ix-a-b') -> 'pupils') as pupil
           where pupil ->> 'handle' = 'kid_14_ok'), '1', 'the teacher''s table counts the notes a pupil received');
select is((select pupil ->> 'notes' from jsonb_array_elements(public.class_points_table('clasa-a-ix-a-b') -> 'pupils') as pupil
           where pupil ->> 'handle' = 'teen_17'), '0', 'a pupil with no notes shows 0');

/* ---------- 4. Reporting one pupil's points (G09) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of($$select public.report_pupil_class_points('clasa-a-ix-a-b', 'kid_14_ok', 'swapped', null)$$),
          'points:not_teacher', 'a pupil can''t report points');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.report_pupil_class_points('clasa-a-ix-a-b', 'kid_14_ok', 'because', null)$$),
          'report:reason', 'an unknown reason is refused');
select is(pg_temp.hint_of($$select public.report_pupil_class_points('clasa-a-ix-a-b', 'teen_17', 'other', null)$$),
          'points:not_offered', 'a pupil who received no points can''t be reported');
select is(public.report_pupil_class_points('clasa-a-ix-a-b', 'kid_14_ok', 'swapped', 'Mereu aceiași doi.') ->> 'reported',
          '1', 'the teacher reports a pupil''s points with a reason');
select pg_temp.as_postgres();
select is((select note from public.class_point_flags where chapter_id = pg_temp.kept_id('chapter')
           and kind = 'teacher_report' and closed_at is null), 'swapped: Mereu aceiași doi.',
          'the moderators read the reason and the teacher''s words');
select is((select count(*)::integer from public.space_moderation_log as log
           join public.spaces on spaces.id = log.space_id
           where spaces.slug = 'clasa-a-ix-a-b' and log.action = 'class_points_reported'), 1,
          'the class log gets one line');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.class_points_summary('clasa-a-ix-a-b') -> 'week' ->> 'reported'), '1',
          'this week''s totals count the open report');

/* ---------- 5. The chapter's box for the teacher, and the lock (G10) ---------- */

select public.set_teacher_points('chapter', pg_temp.kept_id('chapter'), 7, 'Bravo.');
select is(public.class_chapter_points(pg_temp.kept_id('chapter')) -> 'received',
          '{"total": 2, "notes": 1}'::jsonb, 'the teacher sees the points and how many notes, never the words');
select is(public.class_chapter_points(pg_temp.kept_id('chapter')) ->> 'teacher_locked', 'false',
          'teacher points stay open while no competition is published');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok(public.class_chapter_points(pg_temp.kept_id('chapter')) ->> 'teacher_locked' is null,
          'the writer isn''t told about the lock');

-- A competition kid_14_ok entered, ended after the chapter came out, is published.
select pg_temp.as_postgres();
with made as (
  insert into public.class_competitions (user_id, space_id, name, starts_on, ends_on, starts_at, ends_at, ended_at, published_at)
  select '00000000-0000-4000-8000-000000000007', spaces.id, 'Concursul de toamnă', current_date - 2, current_date,
         now() - interval '2 days', now() + interval '1 minute', now(), now()
  from public.spaces where slug = 'clasa-a-ix-a-b'
  returning id)
insert into kept select 'competition', id::text from made;
insert into public.class_competition_entrants (user_id, competition_id, space_id)
select '00000000-0000-4000-8000-000000000003', pg_temp.kept_id('competition'), spaces.id
from public.spaces where slug = 'clasa-a-ix-a-b';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.class_chapter_points(pg_temp.kept_id('chapter')) ->> 'teacher_locked', 'true',
          'the teacher sees the points are locked once the competition is published');
select is(pg_temp.hint_of(format($$select public.set_teacher_points('chapter', %L, 9, 'Altfel.')$$, pg_temp.kept('chapter'))),
          'points:locked', 'locked teacher points can''t change');
select is(pg_temp.hint_of(format($$select public.set_teacher_points('chapter', %L)$$, pg_temp.kept('chapter'))),
          'points:locked', 'locked teacher points can''t be removed');
select pg_temp.as_postgres();
select lives_ok($$delete from public.class_teacher_points where chapter_id = (select value::uuid from kept where name = 'chapter')$$,
                'our own clean-up can still remove locked points');

select * from finish();
rollback;
