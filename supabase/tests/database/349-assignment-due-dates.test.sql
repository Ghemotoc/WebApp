-- Database tests for due dates on class assignments (bundle MUST-1, part d; IDEA-20261108-8).
-- What it proves:
-- - the teacher sets a due date on a class thread, and the thread shows it (criterion 1);
-- - a student, someone outside the class and a thread outside any class can't have one, and a day
--   already gone is refused;
-- - the class space lists open assignments soonest first, with whether the caller replied
--   (criterion 2);
-- - the day before, a student who hasn't replied gets one reminder, never during quiet hours and
--   never twice; one who replied gets none (criterion 3);
-- - a reply after the due date is marked for the teacher only (criterion 4);
-- - assignment_reminders: a student reads their own rows (allowed) and nobody else's (denied).
-- Personas: adult_writer (…01), kid_14_ok (…03), kid_14_waiting (…04), teacher (…07). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Minors take part in a class, so this test runs with the age gate on (as in test 285).
update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- Set-up: a class with two assignments and two students ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a VIII-a', 'Atelier de scris.');
insert into kept select 'first', public.start_forum_thread('space-clasa-a-viii-a', 'Tema 1', 'Scrieți o pagină.') ->> 'thread_number';
insert into kept select 'second', public.start_forum_thread('space-clasa-a-viii-a', 'Tema 2', 'Un poem.') ->> 'thread_number';
insert into kept select 'code', public.make_class_invite('clasa-a-viii-a', 30, 10) ->> 'code';
insert into kept select 'other', public.start_forum_thread('first-chapters', 'Nu e o clasă', 'Un fir obișnuit.') ->> 'thread_number';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space((select value from kept where name = 'code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select public.join_class_space((select value from kept where name = 'code'));

select pg_temp.as_postgres();
insert into kept select 'first_id', id::text from public.forum_threads
  where thread_number = (select value from kept where name = 'first')::integer;
insert into kept select 'second_id', id::text from public.forum_threads
  where thread_number = (select value from kept where name = 'second')::integer;
insert into kept select 'other_id', id::text from public.forum_threads
  where thread_number = (select value from kept where name = 'other')::integer;

/* ---------- 1. Setting a due date ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok(format('select public.set_forum_thread_due_date(%L, public.romania_today() + 5)',
    (select value from kept where name = 'first_id')),
  'the teacher gives an assignment a due date');
select lives_ok(format('select public.set_forum_thread_due_date(%L, public.romania_today() + 1)',
    (select value from kept where name = 'second_id')),
  'and another one, due sooner');
select is((public.forum_thread((select value from kept where name = 'first')::bigint) -> 'thread' ->> 'due_on')::date,
  public.romania_today() + 5, 'the thread shows its due date');
select is(pg_temp.error_hint(format('select public.set_forum_thread_due_date(%L, public.romania_today() - 1)',
    (select value from kept where name = 'first_id'))),
  'due_in_past', 'a day already gone is refused');
select is(pg_temp.error_hint(format('select public.set_forum_thread_due_date(%L, public.romania_today() + 3)',
    (select value from kept where name = 'other_id'))),
  'not_teacher', 'a thread outside any class can''t have one, even for its own writer');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.error_hint(format('select public.set_forum_thread_due_date(%L, public.romania_today() + 3)',
    (select value from kept where name = 'first_id'))),
  'not_teacher', 'a student can''t set one');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.error_hint(format('select public.set_forum_thread_due_date(%L, null)',
    (select value from kept where name = 'first_id'))),
  'not_teacher', 'nor can someone outside the class clear one');

/* ---------- 2. The class space lists open assignments ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.reply_to_forum_thread((select value from kept where name = 'second')::integer, 'Gata!');
select is((select string_agg(entry ->> 'title', ',' order by ordinality)
           from jsonb_array_elements(public.class_space_assignments('clasa-a-viii-a')) with ordinality as listed (entry, ordinality)),
  'Tema 2,Tema 1', 'a student sees the open assignments soonest first');
select is(public.class_space_assignments('clasa-a-viii-a') -> 0 ->> 'has_replied', 'true',
  'with the ones they have replied to marked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.class_space_assignments('clasa-a-viii-a'), '[]'::jsonb,
  'someone outside the class sees none');

/* ---------- 3. The reminder the day before ---------- */

select pg_temp.as_postgres();
select is(public.send_assignment_reminders(((public.romania_today() + time '23:30') at time zone 'Europe/Bucharest')),
  0, 'nothing is sent during quiet hours');
select is(public.send_assignment_reminders(((public.romania_today() + time '17:00') at time zone 'Europe/Bucharest')),
  1, 'outside them, one student is reminded the day before');
select is((select count(*)::integer from public.notifications
           where kind = 'assignment_due' and user_id = '00000000-0000-4000-8000-000000000004'
             and forum_thread_id = (select value::uuid from kept where name = 'second_id')),
  1, 'the student who hasn''t replied gets it');
select is((select count(*)::integer from public.notifications
           where kind = 'assignment_due' and user_id = '00000000-0000-4000-8000-000000000003'),
  0, 'the one who replied doesn''t');
select is(public.send_assignment_reminders(((public.romania_today() + time '18:00') at time zone 'Europe/Bucharest')),
  0, 'and nobody is reminded twice');

/* ---------- 4. Who reads the reminders ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((select count(*)::integer from public.assignment_reminders), 1,
  'a student reads their own reminder rows');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((select count(*)::integer from public.assignment_reminders), 0,
  'and never anyone else''s');

/* ---------- 5. Late replies, for the teacher only ---------- */

-- The second assignment's due date moves back to two days ago (staff-side, to stand in for time
-- passing), so kid_14_ok's reply from today now came after it.
select pg_temp.as_postgres();
update public.forum_threads set due_on = public.romania_today() - 2
  where id = (select value::uuid from kept where name = 'second_id');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select string_agg((entry ->> 'handle') || ':' || (entry ->> 'is_late'), ',' order by entry ->> 'handle')
           from jsonb_array_elements(public.class_thread_replies((select value::uuid from kept where name = 'second_id')) -> 'replied') as entry),
  'kid_14_ok:true', 'the teacher sees a reply after the due date marked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_thread_replies((select value::uuid from kept where name = 'second_id')), null,
  'a student never sees the marks');

select * from finish();
rollback;
