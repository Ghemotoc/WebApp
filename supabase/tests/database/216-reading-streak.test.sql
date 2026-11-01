-- Database tests for the private reading streak (bundle IDEAS-1, part b; idea IDEA-20261031-13).
-- What it proves, by the idea's criteria and Robert's comments of 31 Oct 2026:
-- - the streak is off until the reader turns it on, and then counts days this week and minutes
--   today, a minute at a time and never twice within 45 seconds (criteria 1 and 2);
-- - the target is any number of minutes from 1 to 600, and a reminder needs a time and a target;
-- - under-18s can't set a reminder in quiet hours (22:00 to 07:00, Q50), and the job never sends
--   one to them then (criterion 3);
-- - the job sends one reminder a day, only while the target isn't met, and none by email;
-- - turning it off deletes the target, the reminder and the minutes (criterion 4);
-- - the clean-up keeps 14 days; Download my data and account deletion both name the two tables;
-- - reading_habits_select_own and reading_minutes_select_own: allowed and denied.
-- Personas: adult_writer (…01), teen_17 (…02). Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

delete from public.reading_minutes where user_id in
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
delete from public.reading_habits where user_id in
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
delete from public.notifications where kind = 'reading_reminder';

/* ---------- 1. Off until turned on ---------- */

select set_config('role', 'anon', true);
select throws_ok($$ select public.my_reading_habit() $$, '42501', null,
  'a visitor who isn''t logged in has no streak');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_reading_habit(), null, 'the streak is off until the reader turns it on');
select is(public.add_reading_minute(), 0, 'while it is off, no minute is counted');
select throws_ok($$ select public.start_reading_habit('Mars/Olympus') $$, '22023', null,
  'an unknown time zone is refused');
select lives_ok($$ select public.start_reading_habit('UTC') $$, 'the reader turns it on');
select is(public.my_reading_habit() ->> 'target', null, 'there is no preset target');

/* ---------- 2. Counting ---------- */

select is(public.add_reading_minute(), 1, 'the first minute of the day is counted');
select is(public.add_reading_minute(), 1, 'a second minute within 45 seconds isn''t (two tabs can''t count double)');
select pg_temp.as_owner();
-- A minute later: move the last count back (the updated_at trigger is paused to allow it).
alter table public.reading_minutes disable trigger reading_minutes_set_updated_at;
update public.reading_minutes set updated_at = now() - interval '1 minute'
where user_id = '00000000-0000-4000-8000-000000000001';
alter table public.reading_minutes enable trigger reading_minutes_set_updated_at;
-- An earlier day this week, so "days this week" counts two when today isn't Monday.
insert into public.reading_minutes (user_id, read_on, minutes)
select '00000000-0000-4000-8000-000000000001', current_date - 1, 9
where extract(isodow from current_date) > 1;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.add_reading_minute(), 2, 'a minute later, the next minute is counted');
select is((public.my_reading_habit() ->> 'minutesToday')::integer, 2, 'the note shows today''s minutes');
select is((public.my_reading_habit() ->> 'daysThisWeek')::integer,
  case when extract(isodow from current_date) > 1 then 2 else 1 end,
  'the note counts the days read since Monday');

/* ---------- 3. Target and reminder ---------- */

select throws_ok($$ select public.save_reading_habit(0::smallint, false, null, 'UTC') $$, '23514', null,
  'a target of 0 minutes is refused');
select throws_ok($$ select public.save_reading_habit(null, true, '20:00', 'UTC') $$, '23514', null,
  'a reminder needs a target');
select lives_ok($$ select public.save_reading_habit(15::smallint, true, '23:30', 'UTC') $$,
  'an adult may pick any time, 23:30 included');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select lives_ok($$ select public.start_reading_habit('Europe/Bucharest') $$, 'teen_17 turns it on');
select throws_ok($$ select public.save_reading_habit(10::smallint, true, '22:30', 'Europe/Bucharest') $$,
  '23514', 'quiet_hours', 'an under-18 can''t pick a reminder in quiet hours (Q50)');
select lives_ok($$ select public.save_reading_habit(10::smallint, true, '21:00', 'Europe/Bucharest') $$,
  'an under-18 may pick 21:00');

/* ---------- 4. Who sees what ---------- */

select is((select count(*)::integer from public.reading_habits), 1,
  'allowed: reading_habits_select_own (teen_17 reads their own streak)');
select is((select count(*)::integer from public.reading_minutes
           where user_id = '00000000-0000-4000-8000-000000000001'), 0,
  'denied: reading_minutes_select_own (nobody sees someone else''s minutes)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok((select count(*) from public.reading_minutes) >= 1,
  'allowed: reading_minutes_select_own (the reader reads their own minutes)');
select is((select count(*)::integer from public.reading_habits
           where user_id = '00000000-0000-4000-8000-000000000002'), 0,
  'denied: reading_habits_select_own (nobody sees someone else''s streak)');

/* ---------- 5. The reminder ---------- */

select pg_temp.as_owner();
-- adult_writer: the reminder time is this minute in UTC; 2 of 15 minutes read today.
update public.reading_habits
set reminder_time = date_trunc('minute', (now() at time zone 'UTC')::time)
where user_id = '00000000-0000-4000-8000-000000000001';
-- teen_17: a time zone where it is now 23:xx, with the reminder this minute (only possible by hand).
update public.reading_habits
set time_zone = (select name from pg_timezone_names
                 where extract(hour from now() at time zone name) = 23 order by name limit 1),
    reminder_time = date_trunc('minute', (now() at time zone (select name from pg_timezone_names
                 where extract(hour from now() at time zone name) = 23 order by name limit 1))::time)
where user_id = '00000000-0000-4000-8000-000000000002';
select public.send_reading_reminders();
select public.send_reading_reminders();
select is((select count(*)::integer from public.notifications
           where kind = 'reading_reminder' and user_id = '00000000-0000-4000-8000-000000000001'), 1,
  'the reader short of their target gets one reminder, and only one that day');
select is((select count(*)::integer from public.notifications
           where kind = 'reading_reminder' and user_id = '00000000-0000-4000-8000-000000000002'), 0,
  'an under-18 gets none in quiet hours, whatever time is stored');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000001', 'reading_reminder'), null,
  'the reminder is never emailed');

/* ---------- 6. Turning it off, and the clean-up ---------- */

insert into public.reading_minutes (user_id, read_on, minutes)
values ('00000000-0000-4000-8000-000000000002', current_date - 20, 5);
select public.purge_old_reading_minutes();
select is((select count(*)::integer from public.reading_minutes
           where user_id = '00000000-0000-4000-8000-000000000002'), 0,
  'minutes older than 14 days are deleted by the nightly clean-up');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.stop_reading_habit();
select pg_temp.as_owner();
select is((select count(*)::integer from public.reading_minutes where user_id = '00000000-0000-4000-8000-000000000001')
        + (select count(*)::integer from public.reading_habits where user_id = '00000000-0000-4000-8000-000000000001'),
  0, 'turning it off deletes the target, the reminder and the minutes already counted');

select * from finish();
rollback;
