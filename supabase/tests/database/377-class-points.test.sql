-- Database tests for class points (bundle CLASS-POINTS, part 1; stories S1-E8-13 "Class points
-- from classmates" and S1-E8-14 "Teacher points"; Robert, 13 Nov 2026).
-- What it proves:
-- - class points are off for a new class, and only its teacher turns them on (S1-E8-16 criterion 1);
-- - a pupil gives 1 to 3 points to a classmate's chapter they opened, within a weekly budget of
--   10; their own chapter, an unopened chapter, a 4th point and an empty budget are refused;
-- - points can be moved until the week ends; a new week starts a new budget and locks the old one;
-- - a note is one line of at most 140 characters, with a comment's filters;
-- - the writer sees the points and notes they received, never who gave them; a classmate sees no
--   counter; the teacher sees totals, never the giver;
-- - the teacher gives 0 to 10 points and a private note to a chapter or an assignment reply; the
--   pupil sees "Teacher points" and the note; nobody else does; the kill switch hides notes;
-- - the teacher's table has both numbers per pupil, no rank and no giver;
-- - each table policy has an allowed and a denied test (CLAUDE.md rule 1).
-- Personas: adult_writer (…01, outside the class), teen_17 (…02), kid_14_ok (…03), teacher (…07),
-- moderator (…10, staff). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(62);

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
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. A class, two pupils and their chapters ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a IX-a', 'Atelier de scris.');
insert into kept select 'code', public.make_class_invite('clasa-a-ix-a', 30, 10) ->> 'code';
insert into kept select 'thread', public.start_forum_thread('space-clasa-a-ix-a', 'Tema 1', 'Scrieți o pagină.') ->> 'thread_number';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_space(pg_temp.kept('code'));

-- kid_14_ok writes a story with two published chapters and shares it with the class.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.create_story('Caietul albastru', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c1a01',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.as_postgres();
insert into kept select 'kid_slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000c1a01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
insert into kept select 'kid_code_1', public.create_chapter(pg_temp.kept('kid_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('kid_code_1'), 'Începutul', 'Prima zi de școală.', 1);
select public.publish_chapter(pg_temp.kept('kid_code_1'));
insert into kept select 'kid_code_2', public.create_chapter(pg_temp.kept('kid_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('kid_code_2'), 'A doua zi', 'Plouă.', 1);
select public.publish_chapter(pg_temp.kept('kid_code_2'));
select public.set_story_class(pg_temp.kept('kid_slug'), 'clasa-a-ix-a');
select public.reply_to_forum_thread(pg_temp.kept('thread')::integer, 'Tema mea.');

-- teen_17 writes one chapter and shares it too.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.create_story('Jurnal de toamnă', 'Pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c1a02',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.as_postgres();
insert into kept select 'teen_slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000c1a02';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
insert into kept select 'teen_code', public.create_chapter(pg_temp.kept('teen_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('teen_code'), 'Septembrie', 'Frunze.', 1);
select public.publish_chapter(pg_temp.kept('teen_code'));
select public.set_story_class(pg_temp.kept('teen_slug'), 'clasa-a-ix-a');

select pg_temp.as_postgres();
insert into kept select 'kid_chapter_1', id::text from public.chapters where code = pg_temp.kept('kid_code_1');
insert into kept select 'kid_chapter_2', id::text from public.chapters where code = pg_temp.kept('kid_code_2');
insert into kept select 'teen_chapter', id::text from public.chapters where code = pg_temp.kept('teen_code');
insert into kept select 'reply', forum_posts.id::text from public.forum_posts
  join public.forum_threads on forum_threads.id = forum_posts.thread_id
  where forum_threads.thread_number = pg_temp.kept('thread')::integer
    and forum_posts.user_id = '00000000-0000-4000-8000-000000000003';
insert into kept select 'thread_id', id::text from public.forum_threads
  where thread_number = pg_temp.kept('thread')::integer;

/* ---------- 2. Off until the teacher turns them on (S1-E8-16 criterion 1) ---------- */

select is((select class_points_on from public.spaces where slug = 'clasa-a-ix-a'), false,
  'class points are off for a new class');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_points_summary('clasa-a-ix-a') ->> 'enabled', 'false', 'a pupil is told they are off');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')), null,
  'and a chapter shows nothing about points while they are off');
select is(pg_temp.hint_of($$select public.set_class_points('clasa-a-ix-a', true)$$), 'space:not_allowed',
  'a pupil can''t turn class points on');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.set_class_points('fantasy-writers-circle', true)$$), 'space:not_allowed',
  'nor can a teacher in a space that isn''t theirs');
select is(public.set_class_points('clasa-a-ix-a', true) ->> 'enabled', 'true', 'the teacher turns them on');
select is(public.class_points_summary('clasa-a-ix-a') ->> 'role', 'teacher', 'and is the teacher there');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.space_moderation_log where action = 'class_points_on'), 1,
  'turning them on is in the class''s log');

/* ---------- 3. Giving points (S1-E8-13) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_points_summary('clasa-a-ix-a') ->> 'left', '10',
  'criterion 1: a pupil has 10 points to give this week');
select is((public.class_points_summary('clasa-a-ix-a') ->> 'resets_on')::date,
  (date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 7),
  'and is told the day a new budget starts: next Monday');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 2)$$, pg_temp.kept('kid_chapter_1'))),
  'points:not_opened', 'criterion 4: points can''t go to a chapter the pupil hasn''t opened');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) ->> 'role', 'classmate',
  'opening the chapter shows the give control to a classmate');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'received', 'null'::jsonb,
  'criterion 8: a classmate sees no points counter');
select is(public.give_class_points(pg_temp.kept_id('kid_chapter_1'), 3, 'Mi-a plăcut   finalul!') -> 'giving' ->> 'left', '7',
  'criterion 2: 3 points move from the budget to the chapter');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 4)$$, pg_temp.kept('kid_chapter_1'))),
  'points:cap', 'criterion 3: a 4th point to the same chapter is refused');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 1)$$, pg_temp.kept('teen_chapter'))),
  'points:not_offered', 'criterion 3: nor points to their own chapter');
select is(public.class_chapter_points(pg_temp.kept_id('teen_chapter')) ->> 'role', 'writer',
  'on their own chapter they are the writer, with no give control');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 1, %L)$$, pg_temp.kept('kid_chapter_1'), repeat('a', 141))),
  'note:too_long', 'criterion 6: a note has at most 140 characters');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 1, 'un <b>text</b>')$$, pg_temp.kept('kid_chapter_1'))),
  'note:html', 'and goes through a comment''s filters');
select is(public.give_class_points(pg_temp.kept_id('kid_chapter_1'), 2, 'Mi-a plăcut finalul!') -> 'giving' ->> 'left', '8',
  'criterion 5: until the week ends a pupil can move points: 3 becomes 2');
select public.class_chapter_points(pg_temp.kept_id('kid_chapter_2'));
select is(public.give_class_points(pg_temp.kept_id('kid_chapter_2'), 3) -> 'giving' ->> 'left', '5',
  'points to a second chapter come from the same budget');

-- allowed: class_point_gifts_select_own: the giver reads their own gifts.
select is((select count(*)::integer from public.class_point_gifts), 2,
  'allowed: class_point_gifts_select_own: the giver reads their own two gifts');
-- allowed: class_chapter_opens_select_own.
select is((select count(*)::integer from public.class_chapter_opens), 2,
  'allowed: class_chapter_opens_select_own: the pupil reads the chapters they opened');

/* ---------- 4. What the writer, a classmate and the teacher see ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'received' ->> 'total', '2',
  'criterion 7: the writer sees the points their chapter received');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'received' -> 'notes' -> 0 ->> 'note',
  'Mi-a plăcut finalul!', 'and the note, on one line');
select is((select count(*)::integer from jsonb_object_keys(
    public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'received' -> 'notes' -> 0)), 2,
  'a note is its ID and its words, never who gave it');
select is(public.class_points_summary('clasa-a-ix-a') ->> 'received_total', '5',
  'the class page tells the writer how many points they received in all');
-- denied: class_point_gifts_select_own: the writer can't read who gave points from the table.
select is((select count(*)::integer from public.class_point_gifts), 0,
  'denied: class_point_gifts_select_own: the writer reads no gift from the table, so never the giver');
-- denied: class_chapter_opens_select_own.
select is((select count(*)::integer from public.class_chapter_opens), 0,
  'denied: class_chapter_opens_select_own: nobody reads another pupil''s opened chapters');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'received', '{"total": 2}'::jsonb,
  'the teacher sees the chapter''s total and nothing else about its points');
select is((select count(*)::integer from public.class_point_gifts), 0,
  'denied: class_point_gifts_select_moderators: the teacher reads no gift, so never who gave points');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 1)$$, pg_temp.kept('kid_chapter_1'))),
  'points:not_offered', 'the teacher has no weekly budget: they give teacher points');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')), null,
  'an adult outside the class learns nothing about a chapter''s points');
select is(public.class_points_summary('clasa-a-ix-a'), null, 'nor about the class''s points');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 1)$$, pg_temp.kept('kid_chapter_1'))),
  'points:not_offered', 'and can give none');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.class_point_gifts), 2,
  'allowed: class_point_gifts_select_moderators: our moderators read every gift with its giver');

/* ---------- 5. The budget and the week ---------- */

-- kid_14_ok gives teen_17's chapter 3; the budget is per pupil.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.class_chapter_points(pg_temp.kept_id('teen_chapter'));
select is(public.give_class_points(pg_temp.kept_id('teen_chapter'), 3) -> 'giving' ->> 'left', '7',
  'each pupil has their own budget');

-- teen_17 gave 2 and 3; with a budget of 4, raising the first gift to 3 would make 6.
select pg_temp.as_postgres();
update public.settings set value = '4'::jsonb where key = 'class_points_weekly_budget';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of(format($$select public.give_class_points(%L, 3)$$, pg_temp.kept('kid_chapter_1'))),
  'points:budget', 'points beyond what is left of the week''s budget are refused');
select pg_temp.as_postgres();
update public.settings set value = '10'::jsonb where key = 'class_points_weekly_budget';

-- The week ends: last week's gifts are locked and a new budget starts.
update public.class_point_gifts set week_start = week_start - 7;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_points_summary('clasa-a-ix-a') ->> 'left', '10',
  'criterion 5: a new week starts a new budget; unspent points are gone');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'giving' ->> 'given', '0',
  'and this week nothing is given to the chapter yet');
select is(public.give_class_points(pg_temp.kept_id('kid_chapter_1'), 3) -> 'giving' ->> 'left', '7',
  'the cap is per week: 3 more points can go to the same chapter');
select pg_temp.as_postgres();
select is((select points::integer from public.class_point_gifts
           where chapter_id = pg_temp.kept_id('kid_chapter_1') and week_start < public.class_points_week_start()), 2,
  'last week''s gift is locked: it stays as it was');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'received' ->> 'total', '5',
  'the writer''s total counts every week');

/* ---------- 6. Teacher points (S1-E8-14) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of(format($$select public.set_teacher_points('chapter', %L, 5)$$, pg_temp.kept('kid_chapter_1'))),
  'points:not_teacher', 'a pupil can''t give teacher points');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.set_teacher_points('chapter', %L, 11)$$, pg_temp.kept('kid_chapter_1'))),
  'points:range', 'criterion 1: teacher points are 0 to 10');
select is(public.set_teacher_points('chapter', pg_temp.kept_id('kid_chapter_1'), 7, 'Un început bun. Lucrează la dialog.') ->> 'points',
  '7', 'the teacher gives 7 points with a private note');
select is(public.set_teacher_points('chapter', pg_temp.kept_id('kid_chapter_1'), 8, 'Un început bun. Lucrează la dialog.') ->> 'points',
  '8', 'and can change them');
select is(public.set_teacher_points('reply', pg_temp.kept_id('reply'), 6) ->> 'points', '6',
  'criterion 1: an assignment reply can be marked too');
-- allowed: class_teacher_points_select_own.
select is((select count(*)::integer from public.class_teacher_points), 2,
  'allowed: class_teacher_points_select_own: the teacher reads the marks they gave');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'teacher' ->> 'points', '8',
  'criterion 2: the pupil sees "Teacher points: 8" on their chapter');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'teacher' ->> 'note',
  'Un început bun. Lucrează la dialog.', 'criterion 4: and the teacher''s private note');
select is(public.class_thread_teacher_points(pg_temp.kept_id('thread_id')) -> 'replies' -> 0 ->> 'points', '6',
  'and the points on their assignment reply');
-- denied: class_teacher_points_select_own: the pupil doesn't read the table.
select is((select count(*)::integer from public.class_teacher_points), 0,
  'denied: class_teacher_points_select_own: a pupil reads no mark from the table');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'teacher', 'null'::jsonb,
  'criterion 4: a classmate never sees another pupil''s teacher points or note');
select is(jsonb_array_length(public.class_thread_teacher_points(pg_temp.kept_id('thread_id')) -> 'replies'), 0,
  'nor the points on another pupil''s reply');
select is((select count(*)::integer from public.class_teacher_points), 0,
  'denied: class_teacher_points_select_moderators: a classmate reads no mark from the table');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.class_teacher_points), 2,
  'allowed: class_teacher_points_select_moderators: our moderators read the marks and notes');

-- The kill switch hides the note and refuses a new one; the points stay.
select pg_temp.as_postgres();
update public.feature_flags set is_enabled = false where key = 'class_teacher_notes';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'teacher',
  jsonb_build_object('id', (public.class_chapter_points(pg_temp.kept_id('kid_chapter_1')) -> 'teacher' -> 'id'),
    'points', 8, 'note', null),
  'with the kill switch off the note is hidden and the points stay');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.set_teacher_points('chapter', %L, 8, 'Încă o notă')$$, pg_temp.kept('kid_chapter_1'))),
  'note:off', 'and a new note is refused');
select pg_temp.as_postgres();
update public.feature_flags set is_enabled = true where key = 'class_teacher_notes';

/* ---------- 7. The teacher's table (S1-E8-14 criterion 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(
  (select jsonb_agg(jsonb_build_array(pupil ->> 'handle', pupil -> 'class_points', pupil -> 'teacher_points'))
   from jsonb_array_elements(public.class_points_table('clasa-a-ix-a') -> 'pupils') as pupil),
  '[["kid_14_ok", 8, 14], ["teen_17", 3, 0]]'::jsonb,
  'the table shows each pupil''s class points and teacher points side by side');
select is(public.class_points_table('clasa-a-ix-a')::text ~ 'rank|giver|user_id', false,
  'with no rank number and no giver anywhere in it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_points_table('clasa-a-ix-a'), null, 'a pupil never gets the table');

select * from finish();
rollback;
