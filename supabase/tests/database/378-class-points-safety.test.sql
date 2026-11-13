-- Database tests for the controls on class points (bundle CLASS-POINTS, part 1; story S1-E8-16
-- "Class points controls and safety"; Robert, 13 Nov 2026).
-- What it proves:
-- - the teacher reports a chapter's points as suspicious; only our moderators see the flag, and
--   only they see who gave the points; that read is in the audit log;
-- - a moderator removes a gift with a reason; it is logged, the chapter's total drops and the
--   giver has the points back while the week is open (criterion 2);
-- - two pupils who give each other most of their points three weeks running get a quiet flag
--   that the teacher never sees (criterion 3);
-- - a note with points and a teacher's note can be reported only by the person who received it,
--   and a hidden note stops showing (rule 6);
-- - a pupil who leaves the class takes their gifts off others' totals and loses the points they
--   received (criterion 6);
-- - 30 days after the class is archived the points, notes, opens and flags are deleted
--   (criterion 5), and the nightly job runs every retention job it should;
-- - the flags table's policy has an allowed and a denied test (CLAUDE.md rule 1).
-- Personas: adult_writer (…01, outside the class), teen_17 (…02), kid_14_ok (…03), teacher (…07),
-- moderator (…10, staff). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

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

-- Minors take part in a class, so this test runs with the age gate on (as in tests 232 to 234).
update public.feature_flags set is_enabled = false where key = 'adults_only';

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;
create function pg_temp.kept(wanted text) returns text language sql as $$
  select value from kept where name = wanted $$;
create function pg_temp.kept_id(wanted text) returns uuid language sql as $$
  select value::uuid from kept where name = wanted $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. A class with points on, two pupils and a chapter each ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a X-a B', 'Atelier de scris.');
insert into kept select 'code', public.make_class_invite('clasa-a-x-a-b', 30, 10) ->> 'code';
select public.set_class_points('clasa-a-x-a-b', true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_space(pg_temp.kept('code'));

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.create_story('Caietul roșu', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c1b01',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.as_postgres();
insert into kept select 'kid_slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000c1b01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
insert into kept select 'kid_code', public.create_chapter(pg_temp.kept('kid_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('kid_code'), 'Începutul', 'Prima zi de școală.', 1);
select public.publish_chapter(pg_temp.kept('kid_code'));
select public.set_story_class(pg_temp.kept('kid_slug'), 'clasa-a-x-a-b');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.create_story('Jurnal de iarnă', 'Pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c1b02',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.as_postgres();
insert into kept select 'teen_slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000c1b02';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
insert into kept select 'teen_code', public.create_chapter(pg_temp.kept('teen_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('teen_code'), 'Decembrie', 'Ninge.', 1);
select public.publish_chapter(pg_temp.kept('teen_code'));
select public.set_story_class(pg_temp.kept('teen_slug'), 'clasa-a-x-a-b');

select pg_temp.as_postgres();
insert into kept select 'kid_chapter', id::text from public.chapters where code = pg_temp.kept('kid_code');
insert into kept select 'teen_chapter', id::text from public.chapters where code = pg_temp.kept('teen_code');
insert into kept select 'space', id::text from public.spaces where slug = 'clasa-a-x-a-b';

-- Each gives the other 3 points with a note; the teacher marks kid_14_ok's chapter with a note.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.class_chapter_points(pg_temp.kept_id('kid_chapter'));
select public.give_class_points(pg_temp.kept_id('kid_chapter'), 3, 'Bravo!');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.class_chapter_points(pg_temp.kept_id('teen_chapter'));
select public.give_class_points(pg_temp.kept_id('teen_chapter'), 3, 'Frumos scris.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.set_teacher_points('chapter', pg_temp.kept_id('kid_chapter'), 7, 'Lucrează la final.');
select pg_temp.as_postgres();
insert into kept select 'gift_to_kid', id::text from public.class_point_gifts where chapter_id = pg_temp.kept_id('kid_chapter');
insert into kept select 'mark', id::text from public.class_teacher_points where chapter_id = pg_temp.kept_id('kid_chapter');

/* ---------- 2. The teacher reports a chapter's points (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of(format($$select public.report_class_points(%L)$$, pg_temp.kept('kid_chapter'))),
  'points:not_teacher', 'a pupil can''t report a chapter''s points as suspicious');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok(format($$select public.report_class_points(%L, 'Prea multe puncte într-o zi.')$$, pg_temp.kept('kid_chapter')),
  'the teacher reports a chapter''s points as suspicious');
select lives_ok(format($$select public.report_class_points(%L)$$, pg_temp.kept('kid_chapter')),
  'reporting it again while the report is open changes nothing');
select is(public.class_points_table('clasa-a-x-a-b') -> 'pupils' -> 0 -> 'chapters' -> 0 ->> 'is_reported', 'true',
  'the teacher''s table marks the chapter as reported');
-- denied: class_point_flags_select_moderators: the teacher doesn't read the flags table.
select is((select count(*)::integer from public.class_point_flags), 0,
  'denied: class_point_flags_select_moderators: the teacher reads no flag from the table');
select is(pg_temp.state_of($$select public.admin_class_point_flags()$$), '42501',
  'and can''t list the flags');
select is(pg_temp.state_of(format($$select public.admin_class_gifts(%L)$$, pg_temp.kept('kid_chapter'))), '42501',
  'criterion 2 and decision 8: the teacher can never see who gave the points');
select is(pg_temp.state_of(format($$select public.admin_remove_class_gift(%L, 'x')$$, pg_temp.kept('gift_to_kid'))), '42501',
  'nor remove a gift themselves');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
-- allowed: class_point_flags_select_moderators.
select is((select count(*)::integer from public.class_point_flags), 1,
  'allowed: class_point_flags_select_moderators: our moderators read the one open flag');
select is(public.admin_class_point_flags() -> 0 ->> 'kind', 'teacher_report', 'and list it with its class and chapter');
select is(public.admin_class_gifts(pg_temp.kept_id('kid_chapter')) -> 0 ->> 'giver_handle', 'teen_17',
  'criterion 4: a moderator sees who gave the points');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'class_points.givers_viewed'), 1,
  'and that read is in the audit log');

/* ---------- 3. A moderator removes a gift (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of(format($$select public.admin_remove_class_gift(%L, '  ')$$, pg_temp.kept('gift_to_kid'))),
  'reason:empty', 'removing a gift needs a reason');
select lives_ok(format($$select public.admin_remove_class_gift(%L, 'Puncte date la schimb.')$$, pg_temp.kept('gift_to_kid')),
  'a moderator removes the gift with a reason');
select is(pg_temp.hint_of(format($$select public.admin_remove_class_gift(%L, 'Din nou.')$$, pg_temp.kept('gift_to_kid'))),
  'gift:missing', 'a removed gift can''t be removed twice');
select lives_ok(format($$select public.admin_close_class_point_flag(%L)$$,
    public.admin_class_point_flags() -> 0 ->> 'id'), 'and closes the flag');
select pg_temp.as_postgres();
select is((select note from public.space_moderation_log where action = 'class_points_removed'), 'Puncte date la schimb.',
  'the removal and its reason are in the class''s log');
select is((select details::text ~ 'teen_17|00000000-0000-4000-8000-000000000002' from public.space_moderation_log
           where action = 'class_points_removed'), false, 'which doesn''t say who gave the points');
select is((select count(*)::integer from public.audit_log where action = 'class_points.gift_removed'), 1,
  'and the audit log has it too');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter')) -> 'received' ->> 'total', '0',
  'the chapter''s total no longer counts the removed gift');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_points_summary('clasa-a-x-a-b') ->> 'left', '10',
  'the giver has the points back while the week is open');
select is(public.class_chapter_points(pg_temp.kept_id('kid_chapter')) -> 'giving' ->> 'can_give', 'false',
  'but can''t give to that chapter again this week');

/* ---------- 4. Reporting the notes (rule 6) ---------- */

select pg_temp.as_postgres();
insert into kept select 'gift_to_teen', id::text from public.class_point_gifts where chapter_id = pg_temp.kept_id('teen_chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.state_of(format($$select * from public.report_item('class_point_note', %L, 'harassment')$$, pg_temp.kept('gift_to_teen'))),
  '23514', 'the giver can''t report their own note: only the writer who received it can');
select lives_ok(format($$select * from public.report_item('class_teacher_note', %L, 'harassment')$$, pg_temp.kept('mark')),
  'the pupil can report the teacher''s note to them');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select lives_ok(format($$select * from public.report_item('class_point_note', %L, 'harassment')$$, pg_temp.kept('gift_to_teen')),
  'the writer can report a note they received with points');
select is(pg_temp.state_of(format($$select * from public.report_item('class_teacher_note', %L, 'harassment')$$, pg_temp.kept('mark'))),
  '23514', 'a classmate can''t report, or reach, a teacher''s note to someone else');
select pg_temp.as_postgres();
select is(public.reportable_item_summary('class_point_note', pg_temp.kept_id('gift_to_teen')),
  'Note with class points on chapter 1 of Jurnal de iarnă: Frumos scris.',
  'the moderation queue says what the note is');
-- A moderator hides the note: the writer no longer sees it, the points stay.
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000003', 'class_point_note', pg_temp.kept_id('gift_to_teen'), 'hidden',
        '00000000-0000-4000-8000-000000000010', 'Test.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_chapter_points(pg_temp.kept_id('teen_chapter')) -> 'received',
  '{"total": 3, "notes": []}'::jsonb, 'a hidden note stops showing; the points stay');

/* ---------- 5. Pupils who swap points three weeks running (criterion 3) ---------- */

select pg_temp.as_postgres();
-- Three past weeks in which each gave the other all their points.
delete from public.class_point_gifts;
insert into public.class_point_gifts (user_id, space_id, chapter_id, receiver_user_id, week_start, points)
select giver, pg_temp.kept_id('space'), chapter, receiver, public.class_points_week_start() - (7 * weeks_ago), 3
from (values
  ('00000000-0000-4000-8000-000000000002'::uuid, pg_temp.kept_id('kid_chapter'), '00000000-0000-4000-8000-000000000003'::uuid),
  ('00000000-0000-4000-8000-000000000003'::uuid, pg_temp.kept_id('teen_chapter'), '00000000-0000-4000-8000-000000000002'::uuid)
) as swaps (giver, chapter, receiver), generate_series(1, 2) as weeks_ago;
select is(public.flag_class_point_pairs(), 0, 'two weeks of swapping is not flagged yet');
insert into public.class_point_gifts (user_id, space_id, chapter_id, receiver_user_id, week_start, points)
values ('00000000-0000-4000-8000-000000000002', pg_temp.kept_id('space'), pg_temp.kept_id('kid_chapter'),
        '00000000-0000-4000-8000-000000000003', public.class_points_week_start() - 21, 3),
       ('00000000-0000-4000-8000-000000000003', pg_temp.kept_id('space'), pg_temp.kept_id('teen_chapter'),
        '00000000-0000-4000-8000-000000000002', public.class_points_week_start() - 21, 3);
select is(public.flag_class_point_pairs(), 1, 'three weeks running is flagged once');
select is(public.flag_class_point_pairs(), 0, 'and not again for the same weeks');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_class_point_flags() -> 0 -> 'pair', '["teen_17", "kid_14_ok"]'::jsonb,
  'our moderators see the pair');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.class_points_table('clasa-a-x-a-b')::text ~ 'pair', false,
  'the teacher is never told about the flag');

/* ---------- 6. Leaving the class (criterion 6) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.leave_space('clasa-a-x-a-b');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.class_point_gifts
           where user_id = '00000000-0000-4000-8000-000000000002'
              or receiver_user_id = '00000000-0000-4000-8000-000000000002'), 0,
  'a pupil who leaves takes their gifts off others'' totals and loses the points they received');
select is((select count(*)::integer from public.class_point_flags where kind = 'pair'), 0,
  'and the flag about them goes too');

/* ---------- 7. Archiving and the retention job (criterion 5) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.archive_class_space('clasa-a-x-a-b');
select pg_temp.as_postgres();
select is(public.purge_class_points(), 0, 'right after archiving nothing is deleted');
update public.spaces set archived_at = now() - interval '31 days' where slug = 'clasa-a-x-a-b';
-- Two statements: a statement can't see the rows its own function call just deleted.
select ok(public.purge_class_points() > 0, '30 days after archiving the purge deletes rows');
select is(exists (select 1 from public.class_teacher_points where space_id = pg_temp.kept_id('space'))
          or exists (select 1 from public.class_chapter_opens where space_id = pg_temp.kept_id('space')),
  false, 'and the points, notes and opens of that class are gone');
select public.run_retention_jobs();
select is((select array_agg(job_name order by job_name) from public.retention_runs
           where job_name in ('purge_class_points', 'purge_class_certificate_names', 'purge_old_reading_minutes')),
  array['purge_class_certificate_names', 'purge_class_points', 'purge_old_reading_minutes'],
  'the nightly job runs the class points purge, and the certificate names and reading minutes purges again');

select * from finish();
rollback;
