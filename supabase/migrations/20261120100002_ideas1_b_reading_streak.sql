/*
 * The private reading streak (bundle IDEAS-1, part b; idea IDEA-20261031-13, Robert's comments of
 * 31 Oct 2026).
 *
 * What it adds:
 * - reading_habits: one row per reader who turned the streak on: their daily target in minutes
 *   (any number they choose), whether they want a reminder and at what time, and the time zone of
 *   the device they set it on (so "today" and the reminder follow their clock). No row = off.
 * - reading_minutes: one row per reader per day they read: the minutes, nothing else (no chapter,
 *   no story, no minute-by-minute log). Kept 14 days (setting reading_minutes_keep_days), enough
 *   for "this week".
 * - my_reading_habit(), start_reading_habit(), save_reading_habit(), stop_reading_habit() and
 *   add_reading_minute(): the only way in; nobody writes the tables directly.
 * - send_reading_reminders(): every five minutes, one in-app reminder ("A few minutes of
 *   reading?") on a day the reader is still short of their target at their chosen time. Never about
 *   a missed day or a broken streak, never between 22:00 and 07:00 for anyone under 18 (quiet
 *   hours, Q50, 16 Oct 2026), and no email.
 * - Download my data includes both tables; deleting the account deletes them; turning the streak
 *   off deletes them at once (the idea's fourth criterion).
 * Who calls it: the Library's streak note (src/features/reading-habit/) and the chapter reader,
 *   which adds a minute for each minute of active reading. What it calls: notify().
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('reading_minutes_keep_days', '14'::jsonb, false,
   'Days a reader''s daily reading minutes are kept for the private streak (IDEAS-1b, proposal: two weeks covers "this week").')
on conflict (key) do nothing;

/* ---------- The reader's streak settings ---------- */

create table public.reading_habits (
  id uuid primary key default gen_random_uuid(),
  -- The reader (CLAUDE.md rule 15); one row each, and only while the streak is on.
  user_id uuid not null unique references public.profiles (id),
  -- Any number of minutes the reader picks; null until they pick one (Robert, 31 Oct 2026).
  daily_target_minutes smallint,
  -- Off until the reader turns it on (Robert, 31 Oct 2026).
  reminders_on boolean not null default false,
  reminder_time time,
  -- The IANA time zone of the device the reader last saved from, e.g. Europe/Bucharest.
  time_zone text not null,
  -- The reader's own date of the last reminder, so there is at most one a day.
  last_reminded_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_habits_target_in_range
    check (daily_target_minutes is null or daily_target_minutes between 1 and 600),
  constraint reading_habits_reminder_needs_time_and_target
    check (not reminders_on or (reminder_time is not null and daily_target_minutes is not null))
);
comment on table public.reading_habits is
  'kind: user_action
A reader''s private reading streak: daily target, reminder and time zone (IDEAS-1b). Only while it is on.';
create trigger reading_habits_set_updated_at
  before update on public.reading_habits
  for each row execute function public.set_updated_at();
alter table public.reading_habits enable row level security;

-- Who: the reader. Why: the streak is private (the idea's first criterion: never a public badge);
-- nobody else sees whether or how much someone reads. Writes go only through the functions below.
create policy reading_habits_select_own on public.reading_habits
  for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy reading_habits_select_own on public.reading_habits is
  'The reader reads their own streak settings; nobody else (IDEAS-1b).';

grant select on public.reading_habits to authenticated;

/* ---------- The minutes, one row per day ---------- */

create table public.reading_minutes (
  id uuid primary key default gen_random_uuid(),
  -- The reader (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- The reader's own date, in the time zone of reading_habits.
  read_on date not null,
  minutes smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_minutes_one_row_a_day unique (user_id, read_on),
  constraint reading_minutes_in_a_day check (minutes between 1 and 1440)
);
comment on table public.reading_minutes is
  'kind: user_action
Minutes a reader read each day, for their private streak only (IDEAS-1b). Daily totals, no chapter; kept 14 days.';
create trigger reading_minutes_set_updated_at
  before update on public.reading_minutes
  for each row execute function public.set_updated_at();
alter table public.reading_minutes enable row level security;

-- Who: the reader. Why: minutes read are personal data kept only for the reader (the idea's
-- privacy note); nobody else, staff included, reads them. Writes go only through
-- add_reading_minute() and stop_reading_habit().
create policy reading_minutes_select_own on public.reading_minutes
  for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy reading_minutes_select_own on public.reading_minutes is
  'The reader reads their own daily minutes; nobody else (IDEAS-1b).';

grant select on public.reading_minutes to authenticated;

/* ---------- Helpers ---------- */

/**
 * is_known_time_zone: whether a name is a time zone Postgres knows (e.g. Europe/Bucharest).
 * Input: the name. Returns: true or false. Internal: save checks.
 */
create or replace function public.is_known_time_zone(zone_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where pg_timezone_names.name = zone_name);
$$;
comment on function public.is_known_time_zone(text) is
  'Internal: whether a time zone name is one Postgres knows (IDEAS-1b).';
revoke execute on function public.is_known_time_zone(text) from public, anon, authenticated;

/**
 * is_in_quiet_hours: whether a time of day falls in under-18 quiet hours, 22:00 to 07:00
 * (Q50, decided 16 Oct 2026; the times are canvas 6.3's, story S1-E7 proposal).
 * Input: the time. Returns: true or false. Internal: the reminder save and the reminder job.
 */
create or replace function public.is_in_quiet_hours(time_of_day time)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select time_of_day >= time '22:00' or time_of_day < time '07:00';
$$;
comment on function public.is_in_quiet_hours(time) is
  'Internal: whether a time of day is in the under-18 quiet hours, 22:00 to 07:00 (Q50).';
revoke execute on function public.is_in_quiet_hours(time) from public, anon, authenticated;

/**
 * is_under_18_or_unknown: whether a person may be under 18, by their year (and month) of birth
 * and age check; unknown counts as under 18, the safer side. Internal: the reminder rules.
 */
create or replace function public.is_under_18_or_unknown(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
      profiles.age_check_result, (now() at time zone 'Europe/Bucharest')::date) <> '18_plus'
    from public.profiles where profiles.id = person_id), true);
$$;
comment on function public.is_under_18_or_unknown(uuid) is
  'Internal: true unless the person is 18 or over by year of birth and age check (IDEAS-1b).';
revoke execute on function public.is_under_18_or_unknown(uuid) from public, anon, authenticated;

/* ---------- Reading the streak ---------- */

/**
 * my_reading_habit: the caller's streak for the Library note.
 * Returns: null when the streak is off; otherwise {target, remindersOn, reminderTime ("HH:MM"),
 *   daysThisWeek (days with any reading since Monday, on the reader's clock), minutesToday,
 *   isUnder18 (for the quiet hours line)}.
 * Errors: 42501 when signed out.
 * Flow: the Library's ReadingHabitNote and the chapter reader (to know whether to count minutes).
 */
create or replace function public.my_reading_habit()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  habit public.reading_habits;
  today date;
begin
  -- Step 1: only a signed-in reader has a streak.
  if caller is null then
    raise exception 'Log in to see your reading streak.' using errcode = '42501';
  end if;
  select * into habit from public.reading_habits where reading_habits.user_id = caller;
  if habit.id is null then
    return null;
  end if;
  -- Step 2: "today" and "this week" (Monday first, as in Romania) on the reader's own clock.
  today := (now() at time zone habit.time_zone)::date;
  return jsonb_build_object(
    'target', habit.daily_target_minutes,
    'remindersOn', habit.reminders_on,
    'reminderTime', to_char(habit.reminder_time, 'HH24:MI'),
    'daysThisWeek', (select count(*) from public.reading_minutes
      where reading_minutes.user_id = caller
        and reading_minutes.read_on between today - (extract(isodow from today)::integer - 1) and today),
    'minutesToday', coalesce((select reading_minutes.minutes from public.reading_minutes
      where reading_minutes.user_id = caller and reading_minutes.read_on = today), 0),
    'isUnder18', public.is_under_18_or_unknown(caller));
end;
$$;
comment on function public.my_reading_habit() is
  'The caller''s private reading streak, or null when it is off (IDEAS-1b).';
revoke all on function public.my_reading_habit() from public, anon;
grant execute on function public.my_reading_habit() to authenticated;

/* ---------- Turning it on, changing it, turning it off ---------- */

/**
 * start_reading_habit: turns the caller's streak on, with no target and no reminder yet.
 * Input: the device's time zone (IANA name). Returns: nothing. Calling it again changes nothing.
 * Errors: 42501 signed out; 22023 (invalid_parameter_value) for an unknown time zone.
 * Flow: the Library note's "Turn on" button.
 */
create or replace function public.start_reading_habit(device_time_zone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Log in to keep a reading streak.' using errcode = '42501';
  end if;
  if not public.is_known_time_zone(device_time_zone) then
    raise exception 'That time zone isn''t one we know.' using errcode = '22023';
  end if;
  insert into public.reading_habits (user_id, time_zone) values (caller, device_time_zone)
  on conflict (user_id) do nothing;
end;
$$;
comment on function public.start_reading_habit(text) is
  'Turns the caller''s private reading streak on (IDEAS-1b).';
revoke all on function public.start_reading_habit(text) from public, anon;
grant execute on function public.start_reading_habit(text) to authenticated;

/**
 * save_reading_habit: keeps the caller's daily target and reminder.
 * Inputs: the target in minutes (1 to 600, or null for none), whether reminders are on, the
 *   reminder's time (needed when on) and the device's time zone.
 * Returns: nothing.
 * Errors: 42501 signed out; P0002 (no_data_found) when the streak is off; 22023 for an unknown
 *   time zone; 23514 (check_violation) for a target out of range, a reminder without a time or a
 *   target, or, for anyone under 18, a reminder in quiet hours (22:00 to 07:00, Q50).
 * Flow: the Library note's settings.
 */
create or replace function public.save_reading_habit(
  wanted_target smallint,
  wanted_reminders_on boolean,
  wanted_reminder_time time,
  device_time_zone text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  -- Step 1: a signed-in reader whose streak is on, from a clock we know.
  if caller is null then
    raise exception 'Log in to keep a reading streak.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.reading_habits where reading_habits.user_id = caller) then
    raise exception 'Turn the reading streak on first.' using errcode = 'P0002';
  end if;
  if not public.is_known_time_zone(device_time_zone) then
    raise exception 'That time zone isn''t one we know.' using errcode = '22023';
  end if;
  -- Step 2: quiet hours for under-18s: no reminder between 22:00 and 07:00 (Q50).
  if wanted_reminders_on and public.is_in_quiet_hours(wanted_reminder_time)
     and public.is_under_18_or_unknown(caller) then
    raise exception 'quiet_hours' using errcode = '23514';
  end if;
  -- Step 3: keep it; the table's checks refuse a target out of range or a half-set reminder.
  update public.reading_habits set
    daily_target_minutes = wanted_target,
    reminders_on = wanted_reminders_on,
    reminder_time = wanted_reminder_time,
    time_zone = device_time_zone
  where reading_habits.user_id = caller;
end;
$$;
comment on function public.save_reading_habit(smallint, boolean, time, text) is
  'Keeps the caller''s daily reading target and reminder (IDEAS-1b).';
revoke all on function public.save_reading_habit(smallint, boolean, time, text) from public, anon;
grant execute on function public.save_reading_habit(smallint, boolean, time, text) to authenticated;

/**
 * stop_reading_habit: turns the streak off and deletes the minutes already counted (the idea's
 * fourth criterion). Returns: nothing. Errors: 42501 signed out.
 * Flow: the Library note's "Turn off and delete my minutes".
 */
create or replace function public.stop_reading_habit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Log in to change your reading streak.' using errcode = '42501';
  end if;
  delete from public.reading_minutes where reading_minutes.user_id = caller;
  delete from public.reading_habits where reading_habits.user_id = caller;
end;
$$;
comment on function public.stop_reading_habit() is
  'Turns the caller''s reading streak off and deletes their minutes (IDEAS-1b).';
revoke all on function public.stop_reading_habit() from public, anon;
grant execute on function public.stop_reading_habit() to authenticated;

/* ---------- Counting minutes ---------- */

/**
 * add_reading_minute: adds one minute of reading to the caller's today, on their own clock.
 * Ignored when the streak is off, and when the last minute for today came less than 45 seconds
 * ago, so a page left open in two tabs can't count double. A day holds at most 1,440 minutes.
 * Returns: the minutes today (0 when the streak is off). Errors: 42501 signed out.
 * Flow: the chapter reader's useReadingMinutes, once for each minute the reader is active.
 */
create or replace function public.add_reading_minute()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  habit public.reading_habits;
  today date;
  day_row public.reading_minutes;
begin
  -- Step 1: a signed-in reader with the streak on.
  if caller is null then
    raise exception 'Log in to count your reading.' using errcode = '42501';
  end if;
  select * into habit from public.reading_habits where reading_habits.user_id = caller;
  if habit.id is null then
    return 0;
  end if;
  -- Step 2: today's row, created with the first minute.
  today := (now() at time zone habit.time_zone)::date;
  insert into public.reading_minutes (user_id, read_on, minutes) values (caller, today, 1)
  on conflict (user_id, read_on) do nothing
  returning * into day_row;
  if day_row.id is not null then
    return 1;
  end if;
  -- Step 3: one more minute, unless one came in the last 45 seconds or the day is full.
  update public.reading_minutes set minutes = reading_minutes.minutes + 1
  where reading_minutes.user_id = caller and reading_minutes.read_on = today
    and reading_minutes.updated_at < now() - interval '45 seconds'
    and reading_minutes.minutes < 1440;
  return (select reading_minutes.minutes from public.reading_minutes
    where reading_minutes.user_id = caller and reading_minutes.read_on = today);
end;
$$;
comment on function public.add_reading_minute() is
  'Adds one minute of reading to the caller''s day, for their private streak (IDEAS-1b).';
revoke all on function public.add_reading_minute() from public, anon;
grant execute on function public.add_reading_minute() to authenticated;

/* ---------- The reminder ---------- */

/**
 * send_reading_reminders: one in-app reminder ("A few minutes of reading?") to each reader whose
 * reminder time has come today, on their own clock, and who hasn't read their target yet.
 * Rules (Robert, 31 Oct 2026): off unless the reader turned it on; at most one a day; never about
 * a missed day or a broken streak (only today counts, within two hours of the chosen time, so a
 * reminder never arrives the next morning); never in quiet hours for under-18s (Q50); no email
 * (the kind has no email delivery).
 * Returns: how many were sent. Runs every five minutes (job send-reading-reminders).
 */
create or replace function public.send_reading_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  habit record;
  sent_count integer := 0;
begin
  for habit in
    select reading_habits.user_id, (now() at time zone reading_habits.time_zone) as local_now,
      reading_habits.reminder_time, reading_habits.daily_target_minutes
    from public.reading_habits
    where reading_habits.reminders_on
  loop
    -- Step 1: the chosen time has come, within the last two hours, and not already today.
    --   (A late time's window stops at midnight: the next day is a new day, never a catch-up.)
    continue when habit.local_now::time < habit.reminder_time
      or habit.local_now::time - habit.reminder_time >= interval '2 hours';
    continue when exists (select 1 from public.reading_habits as already
      where already.user_id = habit.user_id and already.last_reminded_on = habit.local_now::date);
    -- Step 2: not when the target is met today.
    continue when coalesce((select reading_minutes.minutes from public.reading_minutes
      where reading_minutes.user_id = habit.user_id
        and reading_minutes.read_on = habit.local_now::date), 0) >= habit.daily_target_minutes;
    -- Step 3: quiet hours for under-18s (Q50).
    continue when public.is_in_quiet_hours(habit.local_now::time)
      and public.is_under_18_or_unknown(habit.user_id);
    -- Step 4: send it and remember the day.
    perform public.notify(habit.user_id, 'reading_reminder', null, '{}'::jsonb);
    update public.reading_habits set last_reminded_on = habit.local_now::date
    where reading_habits.user_id = habit.user_id;
    sent_count := sent_count + 1;
  end loop;
  return sent_count;
end;
$$;
comment on function public.send_reading_reminders() is
  'Job: one gentle in-app reading reminder a day, for readers who asked for one (IDEAS-1b).';
revoke execute on function public.send_reading_reminders() from public, anon, authenticated;

select cron.schedule('send-reading-reminders', '*/5 * * * *', 'select public.send_reading_reminders()');

/**
 * notification_category: as in S1-E13-05, with the reading reminder under "your account", like
 * the other notes the app itself sends.
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    else 'replies'
  end;
$$;

/* ---------- Clean-up ---------- */

/**
 * purge_old_reading_minutes: deletes daily minutes older than the keep time (setting
 * reading_minutes_keep_days, 14), so only the last two weeks are ever held.
 * Returns: the rows removed. Called by run_retention_jobs().
 */
create or replace function public.purge_old_reading_minutes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.reading_minutes
  where reading_minutes.read_on < current_date - public.keep_setting('reading_minutes_keep_days', 14);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
comment on function public.purge_old_reading_minutes() is
  'Job step: deletes reading minutes older than reading_minutes_keep_days (IDEAS-1b).';
revoke execute on function public.purge_old_reading_minutes() from public, anon, authenticated;

/**
 * run_retention_jobs: as in S1-E13-04, with purge_old_reading_minutes last.
 */
create or replace function public.run_retention_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_name text;
  removed_count integer;
  total_removed integer := 0;
begin
  -- Accounts first, so their exports and pictures are caught by the purges after them.
  foreach job_name in array array[
    'purge_unconfirmed_accounts', 'purge_expired_exports', 'purge_deleted_pictures',
    'purge_old_staff_records', 'purge_old_audit_log', 'fold_old_daily_totals',
    'purge_old_reading_minutes']
  loop
    execute format('select public.%I()', job_name) into removed_count;
    perform public.record_retention_run(job_name, removed_count);
    total_removed := total_removed + removed_count;
  end loop;
  return total_removed;
end;
$$;

/* ---------- Download my data and account deletion ---------- */

/**
 * data_export_tables: as in S1-E13-03, plus the reading streak's two tables (the reader's own
 * target, reminder and daily minutes go into Download my data, as the idea's privacy note asks).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: which user tables Download my data includes, and why any is left out (S1-E13-02, S1-E13-03, IDEAS-1b).';
revoke execute on function public.data_export_tables() from public, anon, authenticated;

/**
 * account_deletion_rules: as in S1-E13-03, plus the reading streak's two tables, deleted with the
 * account.
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('library_entries', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b).';
revoke execute on function public.account_deletion_rules() from public, anon, authenticated;
