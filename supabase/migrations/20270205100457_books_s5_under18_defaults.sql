/*
 * Migration: under-18 defaults for a healthy habit (design books review, section 5 and item S5;
 * Eyal's "Facilitator": the reading and writing habits must help teenagers, never trap them).
 *
 * What it changes:
 * 1. email_delivery_for(): a kind whose email is Instant by default is a Daily digest by default
 *    for anyone under 18 (or whose age isn't known yet). A choice the person saved still wins, so
 *    a teenager can pick Instant in Settings; safety and legal emails stay required.
 * 2. queue_instant_email(): an Instant email for someone under 18 waits until their quiet hours
 *    are over (21:00 to 07:00 Romanian time by default, the same hours as message emails, Q50).
 *    Required emails (moderation decisions, sign-in changes, data requests) still go at once.
 * 3. my_writing_month(): one rest day a week doesn't break the writing streak. A single day
 *    without words counts as a rest day when the day before it has words and no other rest day
 *    falls in the 6 days before it; the streak counts the days with words. Today still never
 *    breaks it: the writer has the rest of the day.
 * Who calls them: the notification triggers and the daily digest job (1, 2); the Writers' hub's
 * writing month (3, src/features/hub/api/hubMonth.ts).
 * Tests: supabase/tests/database/401-under-18-defaults.test.sql.
 */

/* ---------- 1. Daily digest by default under 18 ---------- */

/*
 * email_delivery_for: one person's email delivery for one notification kind (S1-E7-02).
 * Inputs: the person and the kind. Returns: 'required', 'instant', 'daily' or 'off'.
 * Under 18 (or age unknown), a kind whose default is Instant defaults to Daily digest instead
 * (design books S5); a saved choice still wins. Keeps BOOKS B06's rule (migration
 * 20270205100441): "story finished" reads the reader's choice for new chapters.
 * Flow: queue_instant_email() and queue_daily_digests() → this function; Settings shows it.
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived',
                  'data_request_confirm', 'data_request_extended', 'data_request_copy_ready',
                  'picture_opened_by_staff', 'waitlist_admitted',
                  'account_unused_month', 'account_unused_week',
                  'account_unused_nudge', 'account_unused_closed') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id
         -- BOOKS B06: "story finished" follows the reader's choice for new chapters.
         and settings.kind = case when email_delivery_for.kind = 'story_completed'
                                  then 'new_chapter'::public.notification_kind
                                  else email_delivery_for.kind end)::text,
      -- Design books S5: no instant email by default for a teenager; one digest a day instead.
      case
        when public.default_email_delivery(kind) = 'instant'
             and public.is_under_18_or_unknown(target_user_id) then 'daily'
        else public.default_email_delivery(kind)::text
      end)
  end;
$$;
comment on function public.email_delivery_for(uuid, public.notification_kind) is
  'Internal: one person''s email delivery for one notification kind; under 18, Instant defaults become a Daily digest (S1-E7-02; design books S5).';

/* ---------- 2. Quiet hours for instant emails under 18 ---------- */

/*
 * instant_email_send_time: when an Instant email to this person may go (design books S5).
 * Inputs: the person and the moment the notification was made.
 * Returns: that moment, or the end of their quiet hours when they are under 18 (or age unknown)
 *   and the moment falls inside them.
 * Flow: queue_instant_email() → this function → email_outbox.send_after.
 */
create function public.instant_email_send_time(person_id uuid, made_at timestamptz)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  person public.profiles;
  choices jsonb;
  quiet_end timestamp;
begin
  -- Step 1: adults get their instant emails at once.
  if not public.is_under_18_or_unknown(person_id) then
    return made_at;
  end if;
  -- Step 2: the same quiet hours as message emails (always on under 18, Q50).
  select * into person from public.profiles where profiles.id = person_id;
  if person.id is null then
    return made_at;
  end if;
  choices := public.message_email_choices(person);
  quiet_end := public.quiet_hours_end_after(made_at at time zone 'Europe/Bucharest',
    (choices ->> 'quiet_from')::time, (choices ->> 'quiet_until')::time);
  -- Step 3: inside quiet hours, the email waits for their end.
  if quiet_end is null then
    return made_at;
  end if;
  return quiet_end at time zone 'Europe/Bucharest';
end;
$$;
comment on function public.instant_email_send_time(uuid, timestamptz) is
  'Internal: when an instant email may go; under 18, after quiet hours (design books S5; Q50).';
revoke all on function public.instant_email_send_time(uuid, timestamptz) from public, anon, authenticated;

/*
 * queue_instant_email: queues an instant or required email for a new notification (S1-E7-02).
 * Required emails go at once; an instant one waits for an under-18's quiet hours (design books S5).
 */
create or replace function public.queue_instant_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery text := public.email_delivery_for(new.user_id, new.kind);
begin
  if delivery = 'required' then
    insert into public.email_outbox (user_id, delivery, notification_ids)
    values (new.user_id, delivery, array[new.id]);
  elsif delivery = 'instant' then
    insert into public.email_outbox (user_id, delivery, notification_ids, send_after)
    values (new.user_id, delivery, array[new.id], public.instant_email_send_time(new.user_id, now()));
  end if;
  return new;
end;
$$;
comment on function public.queue_instant_email() is
  'Internal trigger: queues an instant or required email for a new notification; under 18, an instant one waits for quiet hours to end (S1-E7-02; design books S5).';

/* ---------- 3. A rest day keeps the writing streak ---------- */

/*
 * writing_streak: the writer's running streak, in days with words (GAPS-12f; design books S5).
 * Inputs: the writer and today (Romanian date).
 * Returns: the number of days with words in the run that reaches today or yesterday, where one
 *   day without words is a rest day when the day before it has words and no other rest day falls
 *   in the 6 days before it ("one rest day a week does not break the streak"). Today never breaks
 *   it: a day the writer hasn't written in yet is still open.
 * Flow: my_writing_month() → this function.
 */
create function public.writing_streak(writer_id uuid, today date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  written date[];
  day_in_question date := today;
  streak integer := 0;
  last_rest date;
begin
  -- Step 1: the days with words in the last 400 days (a longer streak still shows as 400-odd).
  select coalesce(array_agg(writing_days.day), '{}') into written
  from public.writing_days
  where writing_days.user_id = writer_id and writing_days.words > 0
    and writing_days.day between today - 400 and today;
  -- Step 2: today is still open, so a day without words yet starts the count at yesterday.
  if not (today = any (written)) then
    day_in_question := today - 1;
  end if;
  -- Step 3: walk back, counting days with words and allowing one rest day in any 7.
  loop
    if day_in_question = any (written) then
      streak := streak + 1;
    -- A day without words is a rest day when the day before it has words and no other rest
    -- day falls in the same 7 days; the streak carries on past it, but the day itself isn't counted.
    elsif (day_in_question - 1) = any (written)
      and (last_rest is null or last_rest - day_in_question >= 7) then
      last_rest := day_in_question;
    else
      exit;
    end if;
    day_in_question := day_in_question - 1;
  end loop;
  return streak;
end;
$$;
comment on function public.writing_streak(uuid, date) is
  'Internal: the running writing streak, where one rest day a week doesn''t break it (GAPS-12f; design books S5).';
revoke all on function public.writing_streak(uuid, date) from public, anon, authenticated;

-- Part 4: the writing month reads the streak from writing_streak(), so one rest day a week no
-- longer resets it (design books S5). Everything else is as in GAPS-12f.
create or replace function public.my_writing_month()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  today date := public.romania_today();
  month_start date := date_trunc('month', public.romania_today())::date;
  month_words integer;
  current_streak integer;
  best_month_streak integer;
  comment_count integer;
  entered_contest boolean;
begin
  if caller_id is null then
    raise exception 'Log in to see the writing month.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the month's words.
  select least(coalesce(sum(writing_days.words), 0), 2000000000)::integer into month_words
  from public.writing_days
  where writing_days.user_id = caller_id and writing_days.day >= month_start;
  -- Step 2: the streak still running, ending today or yesterday (today is still open), where one
  -- rest day a week doesn't break it (design books S5).
  current_streak := public.writing_streak(caller_id, today);
  -- Step 3: the longest run inside this month, for the 5-day badge (it stays earned after a gap).
  with written as (
    select writing_days.day,
           writing_days.day - (row_number() over (order by writing_days.day))::integer as run
    from public.writing_days
    where writing_days.user_id = caller_id and writing_days.words > 0 and writing_days.day >= month_start
  )
  select coalesce(max(runs.length), 0) into best_month_streak
  from (select count(*)::integer as length from written group by written.run) as runs;
  -- Step 4: comments left this month that are still up, and a contest entered and not withdrawn.
  select count(*)::integer into comment_count
  from public.comments
  where comments.user_id = caller_id and comments.deleted_at is null
    and (comments.created_at at time zone 'Europe/Bucharest')::date >= month_start;
  select exists (
    select 1 from public.contest_entries
    where contest_entries.user_id = caller_id and contest_entries.status = 'valid'
      and (contest_entries.entered_at at time zone 'Europe/Bucharest')::date >= month_start
  ) into entered_contest;
  return jsonb_build_object(
    'month_start', month_start,
    'goal', 15000,
    'words', month_words,
    'streak_days', current_streak,
    'badges', jsonb_build_object(
      'streak_5', best_month_streak >= 5,
      'first_5000', month_words >= 5000,
      'comments_10', comment_count >= 10,
      'contest_entry', entered_contest,
      'words_15000', month_words >= 15000));

end;
$$;
comment on function public.my_writing_month() is
  'The caller''s writing month: words against a goal of 15,000, the running streak (one rest day a week allowed) and five badges, from their own activity only (GAPS-12f; design books S5).';
