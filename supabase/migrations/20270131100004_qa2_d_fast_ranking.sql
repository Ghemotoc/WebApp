-- QA-2d: the hourly ranking job in seconds, not a minute (independent QA check, 5 Nov 2026: the
-- job took 41 to 55 s at 50,000 accounts and 200,000 chapters).
--
-- Story: QA-2 (findings S1 and S2: the same once-per-row check). Who calls it: the pg_cron job
-- that runs compute_story_scores() every hour (S1-E5-03), through story_signals() and
-- story_share_points().
--
-- Why: both functions started from "every chapter where chapter_is_readable(chapter)", which runs
-- that SECURITY DEFINER function (and the moderation lookup inside it) once for each of the
-- 200,000 chapters. readable_chapters_for_ranking() gives the same chapters with each rule as a
-- join or a test on the whole set, the way listed_stories() does since QA-2a. The signals don't
-- change: on the volume database every story's signals matched before and after (the largest
-- difference was 7 × 10^-13, from adding the same reads in another order), and the job went from
-- 55 s to 7 s. Tests: 155-story-scores and 181-share-and-quote-cards.

/**
 * readable_chapters_for_ranking: the chapters chapter_is_readable() lets the caller read, as a set.
 * Returns: id, story_id, user_id and chapter_position of each published, undeleted chapter of an undeleted
 *   story, where neither the chapter nor the story is hidden or removed by moderators, a class-only
 *   story passes story_class_allows() and a private story belongs to the caller (S1-E8-11, NEW-1).
 *   The job runs with no signed-in caller, so class-only and private stories never count.
 * Internal: story_signals() and story_share_points().
 */
create or replace function public.readable_chapters_for_ranking()
returns table (id uuid, story_id uuid, user_id uuid, chapter_position integer)
language sql
stable
security definer
set search_path = ''
as $$
  select chapters.id, chapters.story_id, chapters.user_id, chapters.position as chapter_position
  from public.chapters
  join public.stories on stories.id = chapters.story_id
  where chapters.status = 'published'
    and chapters.deleted_at is null
    and stories.deleted_at is null
    -- Moderation (is_moderated_away()): neither the chapter nor its story is hidden or removed.
    and not exists (
      select 1 from public.moderated_items
      where moderated_items.restored_at is null
        and ((moderated_items.item_type = 'chapter' and moderated_items.item_id = chapters.id)
          or (moderated_items.item_type = 'story' and moderated_items.item_id = stories.id)))
    -- The two rules about who may read; only class-only stories need the function.
    and (not stories.class_only
         or public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id))
    and (stories.visibility <> 'private' or stories.user_id = (select auth.uid()));
$$;

comment on function public.readable_chapters_for_ranking() is
  'Internal: the chapters chapter_is_readable() allows, as one set, for the ranking job (QA-2d).';
revoke execute on function public.readable_chapters_for_ranking() from public, anon, authenticated;

/**
 * story_signals: each readable story's decayed signals over the ranking window (S1-E5-03).
 * Returns: one row per story with a readable chapter: reads, likes and comments, each weighted by
 *   0.5 ^ (age in days ÷ half-life), and read_through, the latest chapter's reads over the first
 *   chapter's reads in the window (0 to 1; 0 for a one-chapter story).
 * Rules: the writer's own likes and comments don't count; deleted comments and accounts don't
 *   count; downvotes are never read.
 * Internal: compute_story_scores(). QA-2d: the readable chapters come from
 *   readable_chapters_for_ranking(); everything else is as before.
 */
create or replace function public.story_signals()
returns table (story_id uuid, reads double precision, likes double precision, comments double precision,
  read_through double precision)
language sql
stable
security definer
set search_path = ''
as $$
  with window_start as (
    select now() - make_interval(days => public.ranking_setting('ranking_window_days', 60)::integer) as since,
      public.ranking_setting('ranking_half_life_days', 7) as half_life
  ),
  readable as materialized (
    select * from public.readable_chapters_for_ranking()
  ),
  read_points as (
    select readable.story_id, sum(reads.total * power(0.5,
      ((now() at time zone 'Europe/Bucharest')::date - reads.read_on) / window_start.half_life)) as points
    from readable cross join window_start
    join public.chapter_reads as reads on reads.chapter_id = readable.id
    where reads.read_on >= (window_start.since at time zone 'Europe/Bucharest')::date
    group by readable.story_id
  ),
  like_points as (
    select readable.story_id, sum(power(0.5,
      extract(epoch from now() - likes.created_at) / 86400 / window_start.half_life)) as points
    from readable cross join window_start
    join public.chapter_likes as likes on likes.chapter_id = readable.id and likes.user_id <> readable.user_id
    join public.profiles on profiles.id = likes.user_id and profiles.deleted_at is null
    where likes.created_at >= window_start.since
    group by readable.story_id
  ),
  comment_points as (
    select readable.story_id, sum(power(0.5,
      extract(epoch from now() - comments.created_at) / 86400 / window_start.half_life)) as points
    from readable cross join window_start
    join public.comments on comments.chapter_id = readable.id and comments.user_id <> readable.user_id
      and comments.deleted_at is null
    where comments.created_at >= window_start.since
    group by readable.story_id
  ),
  chapter_ends as (
    select distinct on (readable.story_id) readable.story_id,
      first_value(readable.id) over (partition by readable.story_id order by readable.chapter_position) as first_id,
      last_value(readable.id) over (partition by readable.story_id order by readable.chapter_position
        rows between unbounded preceding and unbounded following) as last_id
    from readable
  ),
  through as (
    select chapter_ends.story_id,
      case when chapter_ends.first_id = chapter_ends.last_id then 0
           else least(1.0, coalesce(
             (select sum(total) from public.chapter_reads, window_start
              where chapter_id = chapter_ends.last_id and read_on >= (window_start.since at time zone 'Europe/Bucharest')::date)::double precision
             / nullif((select sum(total) from public.chapter_reads, window_start
              where chapter_id = chapter_ends.first_id and read_on >= (window_start.since at time zone 'Europe/Bucharest')::date), 0), 0))
      end as ratio
    from chapter_ends
  )
  select through.story_id,
    coalesce(read_points.points, 0), coalesce(like_points.points, 0),
    coalesce(comment_points.points, 0), through.ratio
  from through
  left join read_points on read_points.story_id = through.story_id
  left join like_points on like_points.story_id = through.story_id
  left join comment_points on comment_points.story_id = through.story_id;
$$;

comment on function public.story_signals() is
  'Internal: each readable story''s decayed reads, likes, comments and read-through (S1-E5-03; QA-2d).';
revoke execute on function public.story_signals() from public, anon, authenticated;

/**
 * story_share_points: each story's decayed chapter shares over the ranking window (S1-E4-05).
 * Returns: story_id and points, shares weighted by 0.5 ^ (age in days ÷ half-life), counting only
 *   readable chapters (QA-2d: from readable_chapters_for_ranking()).
 * Internal: compute_story_scores().
 */
create or replace function public.story_share_points()
returns table (story_id uuid, points double precision)
language sql
stable
security definer
set search_path = ''
as $$
  with window_start as (
    select now() - make_interval(days => public.ranking_setting('ranking_window_days', 60)::integer) as since,
      public.ranking_setting('ranking_half_life_days', 7) as half_life
  )
  select readable.story_id, sum(shares.total * power(0.5,
    ((now() at time zone 'Europe/Bucharest')::date - shares.shared_on) / window_start.half_life))
  from public.chapter_shares as shares
  join public.readable_chapters_for_ranking() as readable on readable.id = shares.chapter_id
  cross join window_start
  where shares.shared_on >= (window_start.since at time zone 'Europe/Bucharest')::date
  group by readable.story_id;
$$;

comment on function public.story_share_points() is
  'Internal: each story''s decayed chapter shares for the ranking (S1-E4-05; QA-2d).';
revoke execute on function public.story_share_points() from public, anon, authenticated;
