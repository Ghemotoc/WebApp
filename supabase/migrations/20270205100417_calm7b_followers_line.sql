-- Migration: followers as a line graph on the writer dashboard (bundle CALM-7b; Robert, 20 Nov
-- 2026, 12:07 UTC: "followers as a line graph with a time range menu, like LinkedIn"; design
-- handover Step 4, "Followers line graph"; board New-Write, "147 followers").
--
-- What it changes:
-- - writer_followers_line(range_days): the points of the line for the signed-in writer, for the
--   last 7, 30, 90 or 365 days.
-- - writer_dashboard(): adds totals.followers_this_week (the "+21 this week" line) and drops
--   followers_by_week, the eight weekly bars the line replaces.
-- - writer_followers_by_week(): removed; nothing else calls it.
-- No new table or policy. No personal data: the line is counts only, each one rounded by the
-- "fewer than 5" rule (shown_count(), S1-E3-07 criterion 2).

/**
 * writer_followers_line: how the signed-in writer's followers grew over a time range.
 * Input: range_days, one of 7, 30, 90 or 365.
 * Returns: {"points": [...]}, oldest first and newest last. 7 and 30 days give one point a day,
 *   90 days one a week (weeks start on Monday) and 365 days one a calendar month, all in Romania
 *   time (Europe/Bucharest). The last point is the day, week or month still running. Each point is
 *   {starts_on, total, gained}: total is the followers at the end of that day, week or month, and
 *   gained the new follows inside it. Both go through shown_count(), so 1 to 4 comes back as null
 *   and the screen says "fewer than 5".
 * It counts follows_users.created_at of the people who follow the writer now. An unfollow deletes
 *   its row and leaves nothing behind, so the line never dips: someone who followed in March and
 *   left in May drops out of every point, March included.
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for any other range.
 * Who calls it: useFollowersLine() on the Write page (FollowersChart).
 */
create or replace function public.writer_followers_line(range_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  -- Today in Romania, the day every point is counted against.
  today date := (now() at time zone 'Europe/Bucharest')::date;
  -- One point per day, week or month, by the range (handover Step 4).
  step text;
  points jsonb;
begin
  -- Step 1: a signed-in writer and one of the four ranges.
  if caller_id is null then
    raise exception 'Log in to see your numbers.' using errcode = 'insufficient_privilege';
  end if;
  if range_days is null or range_days not in (7, 30, 90, 365) then
    raise exception 'Unknown time range.' using errcode = 'invalid_parameter_value';
  end if;
  step := case when range_days <= 30 then 'day' when range_days = 90 then 'week' else 'month' end;

  -- Step 2: the periods, from the one holding the range's first day to the one holding today,
  -- and for each the followers by its end and the new follows inside it.
  with periods as (
    select period_start::date as starts_on,
      (period_start + ('1 ' || step)::interval)::date as ends_before
    from generate_series(
      date_trunc(step, (today - (range_days - 1))::timestamp),
      date_trunc(step, today::timestamp),
      ('1 ' || step)::interval) as period_start
  ),
  follow_days as (
    select (follows_users.created_at at time zone 'Europe/Bucharest')::date as followed_on
    from public.follows_users
    where follows_users.followed_user_id = caller_id
  )
  select jsonb_agg(jsonb_build_object(
      'starts_on', periods.starts_on,
      'total', public.shown_count((select count(*) from follow_days
        where follow_days.followed_on < periods.ends_before)),
      'gained', public.shown_count((select count(*) from follow_days
        where follow_days.followed_on >= periods.starts_on
          and follow_days.followed_on < periods.ends_before)))
    order by periods.starts_on)
  into points
  from periods;

  -- Step 3: the answer.
  return jsonb_build_object('points', coalesce(points, '[]'::jsonb));
end;
$$;
comment on function public.writer_followers_line(integer) is
  'The signed-in writer''s followers over the last 7, 30, 90 or 365 days, counts only, each rounded by shown_count() (CALM-7b).';
revoke execute on function public.writer_followers_line(integer) from public, anon;
grant execute on function public.writer_followers_line(integer) to authenticated;

/**
 * writer_dashboard: the signed-in writer's dashboard (S1-E3-07), as before, with
 * totals.followers_this_week added and followers_by_week taken out (CALM-7b: the line graph reads
 * writer_followers_line() instead).
 * Input: period, 'all' or 'last_30_days'. Returns: jsonb, every count rounded by shown_count().
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for another period.
 */
create or replace function public.writer_dashboard(period text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  since timestamptz;
  totals record;
begin
  -- Step 1: a signed-in writer and a known period.
  if caller_id is null then
    raise exception 'Log in to see your numbers.' using errcode = 'insufficient_privilege';
  end if;
  if period is null or period not in ('all', 'last_30_days') then
    raise exception 'Unknown period.' using errcode = 'invalid_parameter_value';
  end if;
  if period = 'last_30_days' then
    since := now() - interval '30 days';
  end if;
  -- Step 2: the period's totals across every chapter, summed before rounding.
  select sum(numbers.reads) as reads, sum(numbers.readers) as readers,
    sum(numbers.finished) as finished, sum(numbers.likes) as likes,
    count(*) filter (where numbers.likes > 0) as liked_chapters,
    sum(numbers.comments) as comments, sum(numbers.shares) as shares
  into totals
  from public.writer_chapter_numbers(caller_id, since) as numbers;
  -- Step 3: the whole dashboard, every number rounded by the "fewer than 5" rule.
  return jsonb_build_object(
    'period', period,
    'totals', jsonb_build_object(
      'reads', public.shown_count(totals.reads),
      'read_through', public.read_through_percent(totals.readers, totals.finished),
      'likes', public.shown_count(totals.likes),
      'liked_chapters', totals.liked_chapters,
      'comments', public.shown_count(totals.comments),
      'followers', public.shown_count((select count(*) from public.follows_users
        where follows_users.followed_user_id = caller_id
          and (since is null or follows_users.created_at >= since))),
      'shares', public.shown_count(totals.shares),
      -- The chart's heading always counts every follower, whatever the period.
      'followers_all_time', public.shown_count((select count(*) from public.follows_users
        where follows_users.followed_user_id = caller_id)),
      -- "+21 this week" beside it: new follows since Monday, Romania time (CALM-7b).
      'followers_this_week', public.shown_count((select count(*) from public.follows_users
        where follows_users.followed_user_id = caller_id
          and (follows_users.created_at at time zone 'Europe/Bucharest')::date
            >= date_trunc('week', (now() at time zone 'Europe/Bucharest')::date)::date))),
    'first_published_at', (select min(chapters.first_published_at) from public.chapters
      join public.stories on stories.id = chapters.story_id
      where stories.user_id = caller_id and stories.deleted_at is null and chapters.deleted_at is null),
    'chapters', public.writer_dashboard_chapters(caller_id),
    'latest_comments', public.writer_latest_comments(caller_id));
end;
$$;

-- The weekly bars' function: nothing calls it any more.
drop function public.writer_followers_by_week(uuid);
