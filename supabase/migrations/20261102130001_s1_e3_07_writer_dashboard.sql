-- Migration: the writer dashboard (story S1-E3-07; board design/boards/WriterDashboard.dc.html, 4.1).
--
-- What it adds: no table. Two internal helpers and one function the writer's /write screen calls:
-- - shown_count(): the "fewer than 5" rule in SQL (architecture 1.7.4, 4.1): a number that comes
--   from one to four readers is never sent to the screen;
-- - writer_chapter_numbers(): the raw totals per chapter, from the totals-only tables
--   (chapter_reads, chapter_shares) and from counts over likes, comments and reading places;
-- - writer_dashboard(): what the dashboard shows, already rounded by the rule above.
-- Where things come from: record_chapter_read() (S1-E4-01a), save_reading_position() (S1-E4-03),
-- chapter_likes (S1-E6-03), comments (S1-E6-01), follows_users (S1-E6-05) and chapter_shares
-- (S1-E4-05). Who calls it: src/features/writing/api/dashboard.ts.
-- Privacy (S1-E3-07, legal note: "aggregated data only, which protects minor readers"): the
-- function returns totals only, never a reader's ID or a list of who read; the latest comments
-- are public words the writer can already read under the chapter, shown with the same rules.

/**
 * shown_count: a total as the writer may see it.
 * Input: total (a count of readers, likes, comments or followers).
 * Returns: the total when it is 0 or 5 and over; null for 1 to 4, which the screen shows as
 *   "fewer than 5" (S1-E3-07, criterion 2), so a small number can't point to one reader.
 * Internal: writer_dashboard().
 */
create or replace function public.shown_count(total numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when total is null or total = 0 then 0 when total < 5 then null else total::integer end;
$$;
comment on function public.shown_count(numeric) is
  'Internal: a total, or null when it comes from fewer than 5 (S1-E3-07).';
revoke execute on function public.shown_count(numeric) from public, anon, authenticated;

/**
 * read_through_percent: the share of readers who got to the end of a chapter.
 * Inputs: readers (readers with a saved place), finished (those whose place is at 95% or more).
 * Returns: a whole percentage, or null when fewer than 5 readers have a place (criterion 2).
 * Internal: writer_dashboard().
 */
create or replace function public.read_through_percent(readers numeric, finished numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(readers, 0) < 5 then null
              else round(100.0 * coalesce(finished, 0) / readers)::integer end;
$$;
comment on function public.read_through_percent(numeric, numeric) is
  'Internal: the read-through rate, or null below 5 readers (S1-E3-07).';
revoke execute on function public.read_through_percent(numeric, numeric) from public, anon, authenticated;

/**
 * writer_chapter_numbers: raw totals for each live chapter of a writer's live stories.
 * Inputs: writer_id; since (count only what happened from then on; null for all time).
 * Returns: one row per chapter: chapter_id, reads (chapter openings), readers and finished (signed-
 *   in readers with a saved place, and those at 95% or more: the reader keeps only their latest
 *   place, so this is "got to the end and stayed there"), likes, comments (by other people, shown
 *   to the writer) and shares. The writer's own reads, places, likes and comments never count.
 * Internal: writer_dashboard(); the raw numbers never leave the database unrounded.
 */
create or replace function public.writer_chapter_numbers(writer_id uuid, since timestamptz)
returns table (chapter_id uuid, reads numeric, readers bigint, finished bigint, likes bigint,
  comments bigint, shares numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with writer_chapters as (
    select chapters.id from public.chapters
    join public.stories on stories.id = chapters.story_id
    where stories.user_id = writer_id and stories.deleted_at is null and chapters.deleted_at is null
  ),
  since_day as (
    -- The day totals are kept by Romanian date (Q7), so "since" is a Romanian day too.
    select (since at time zone 'Europe/Bucharest')::date as first_day
  )
  select writer_chapters.id,
    (select coalesce(sum(chapter_reads.total), 0) from public.chapter_reads, since_day
      where chapter_reads.chapter_id = writer_chapters.id
        and (since is null or chapter_reads.read_on >= since_day.first_day)),
    (select count(*) from public.reading_positions
      where reading_positions.chapter_id = writer_chapters.id and reading_positions.user_id <> writer_id
        and (since is null or reading_positions.updated_at >= since)),
    (select count(*) from public.reading_positions
      where reading_positions.chapter_id = writer_chapters.id and reading_positions.user_id <> writer_id
        and reading_positions.percent >= 95
        and (since is null or reading_positions.updated_at >= since)),
    (select count(*) from public.chapter_likes
      where chapter_likes.chapter_id = writer_chapters.id and chapter_likes.user_id <> writer_id
        and (since is null or chapter_likes.created_at >= since)),
    (select count(*) from public.comments
      where comments.chapter_id = writer_chapters.id and comments.user_id <> writer_id
        and public.comment_is_shown_to_caller(comments)
        and (since is null or comments.created_at >= since)),
    (select coalesce(sum(chapter_shares.total), 0) from public.chapter_shares, since_day
      where chapter_shares.chapter_id = writer_chapters.id
        and (since is null or chapter_shares.shared_on >= since_day.first_day))
  from writer_chapters;
$$;
comment on function public.writer_chapter_numbers(uuid, timestamptz) is
  'Internal: raw totals per chapter for the writer dashboard (S1-E3-07).';
revoke execute on function public.writer_chapter_numbers(uuid, timestamptz) from public, anon, authenticated;

/**
 * writer_followers_by_week: new followers of a writer in each of the last 8 weeks.
 * Input: writer_id. Returns: JSON array, oldest week first, of {week_start (a Monday, Romanian
 *   date), total (rounded by shown_count())}; the board's "Followers over time" chart.
 * Internal: writer_dashboard().
 */
create or replace function public.writer_followers_by_week(writer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with weeks as (
    select generate_series(
      date_trunc('week', (now() at time zone 'Europe/Bucharest')::date) - interval '7 weeks',
      date_trunc('week', (now() at time zone 'Europe/Bucharest')::date),
      interval '1 week')::date as week_start
  )
  select jsonb_agg(jsonb_build_object(
    'week_start', weeks.week_start,
    'total', public.shown_count((select count(*) from public.follows_users
      where follows_users.followed_user_id = writer_id
        and (follows_users.created_at at time zone 'Europe/Bucharest')::date >= weeks.week_start
        and (follows_users.created_at at time zone 'Europe/Bucharest')::date < weeks.week_start + 7))
  ) order by weeks.week_start)
  from weeks;
$$;
comment on function public.writer_followers_by_week(uuid) is
  'Internal: new followers per week for the writer dashboard chart (S1-E3-07).';
revoke execute on function public.writer_followers_by_week(uuid) from public, anon, authenticated;

/**
 * writer_latest_comments: the 3 newest comments other people left on a writer's chapters.
 * Input: writer_id (the caller, so comment_is_shown_to_caller() applies their blocks).
 * Returns: JSON array of {display_name, handle, story_slug, chapter_code, chapter_position, body,
 *   created_at}; never a user ID. Deleted, blocked and moderated-away comments are left out.
 * Internal: writer_dashboard().
 */
create or replace function public.writer_latest_comments(writer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(latest.item order by latest.created_at desc), '[]'::jsonb)
  from (
    select comments.created_at, jsonb_build_object(
      'display_name', public.display_name(profiles.handle, profiles.pen_name),
      'handle', profiles.handle,
      'story_slug', stories.slug,
      'chapter_code', chapters.code,
      'chapter_position', chapters.position,
      'body', left(comments.body, 280),
      'created_at', comments.created_at) as item
    from public.comments
    join public.chapters on chapters.id = comments.chapter_id
    join public.stories on stories.id = chapters.story_id
    join public.profiles on profiles.id = comments.user_id
    where stories.user_id = writer_id and stories.deleted_at is null and chapters.deleted_at is null
      and chapters.status = 'published' and comments.user_id <> writer_id
      and public.comment_is_shown_to_caller(comments)
    order by comments.created_at desc
    limit 3
  ) as latest;
$$;
comment on function public.writer_latest_comments(uuid) is
  'Internal: the newest comments on a writer''s chapters for the dashboard (S1-E3-07).';
revoke execute on function public.writer_latest_comments(uuid) from public, anon, authenticated;

/**
 * writer_dashboard_chapters: the per-chapter rows of the dashboard, all time.
 * Input: writer_id. Returns: JSON array of {story_slug, chapter_code, position, title (the
 *   published title, else the draft's), status, scheduled_for, first_published_at, edited_at,
 *   unpublished_at, draft_saved_at, word_count, reads, read_through, likes, comments, shares}, every number
 *   rounded by shown_count() or read_through_percent().
 * Internal: writer_dashboard().
 */
create or replace function public.writer_dashboard_chapters(writer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'story_slug', stories.slug,
    'chapter_code', chapters.code,
    'position', chapters.position,
    'title', coalesce(nullif(chapters.published_title, ''), chapters.draft_title),
    'status', chapters.status,
    'scheduled_for', chapters.scheduled_for,
    'first_published_at', chapters.first_published_at,
    'edited_at', chapters.edited_at,
    'unpublished_at', chapters.unpublished_at,
    'draft_saved_at', coalesce(chapters.draft_saved_at, chapters.updated_at),
    'word_count', chapters.word_count,
    'reads', public.shown_count(numbers.reads),
    'read_through', public.read_through_percent(numbers.readers, numbers.finished),
    'likes', public.shown_count(numbers.likes),
    'comments', public.shown_count(numbers.comments),
    'shares', public.shown_count(numbers.shares)
  ) order by stories.created_at desc, chapters.position), '[]'::jsonb)
  from public.writer_chapter_numbers(writer_id, null) as numbers
  join public.chapters on chapters.id = numbers.chapter_id
  join public.stories on stories.id = chapters.story_id;
$$;
comment on function public.writer_dashboard_chapters(uuid) is
  'Internal: the dashboard''s per-chapter numbers, rounded (S1-E3-07).';
revoke execute on function public.writer_dashboard_chapters(uuid) from public, anon, authenticated;

/**
 * writer_dashboard: everything the signed-in writer's dashboard shows (story S1-E3-07).
 * Input: period: 'all' (all time) or 'last_30_days'; it changes the five tiles only (the board's
 *   chapter table says "Per chapter, all time").
 * Returns: JSON {period, totals: {reads, read_through, likes, liked_chapters, comments, followers,
 *   shares, followers_all_time}, first_published_at, followers_by_week, chapters, latest_comments}. Each count is
 *   null when it comes from 1 to 4 (shown as "fewer than 5"); read_through is null below 5
 *   readers. Never a reader's ID or name list (criterion 3); the latest comments are the public
 *   words under the writer's own chapters.
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for another period.
 * Where it fits: /write (src/features/writing/hooks/useWriterDashboard.ts).
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
        where follows_users.followed_user_id = caller_id))),
    'first_published_at', (select min(chapters.first_published_at) from public.chapters
      join public.stories on stories.id = chapters.story_id
      where stories.user_id = caller_id and stories.deleted_at is null and chapters.deleted_at is null),
    'followers_by_week', public.writer_followers_by_week(caller_id),
    'chapters', public.writer_dashboard_chapters(caller_id),
    'latest_comments', public.writer_latest_comments(caller_id));
end;
$$;
comment on function public.writer_dashboard(text) is
  'The signed-in writer''s dashboard: totals only, "fewer than 5" below five (S1-E3-07).';
revoke execute on function public.writer_dashboard(text) from public, anon;
grant execute on function public.writer_dashboard(text) to authenticated;
