-- Migration: a story's ranking place, "#3 in Fantasy" (story S1-E15-05, bundle ANALYTICS-1b;
-- research doc "Research: reading analytics and suggestions").
--
-- What it does:
-- 1. Three more signals in the hourly popularity score, each with a weight in settings: follows
--    (decayed like likes), finished chapters weighted by their reading time (from S1-E15-04's
--    chapter_finishes) and growth (how much the score rose against 7 days ago).
-- 2. story_rank_place(story_slug): the story's place in its category by score, for anyone who may
--    see the story and for staff who may view stories; shown up to place 100.
-- Who calls it: the story page (src/features/reading) and Stories in the admin site.
-- What it calls next: nothing new.

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('ranking_weight_follows', '6'::jsonb, false,
   'Ranking: points for each follow of a story, decayed like likes (S1-E15-05).'),
  ('ranking_weight_finishes', '2'::jsonb, false,
   'Ranking: points for each finished chapter, times its reading minutes (S1-E15-05).'),
  ('ranking_weight_growth', '0.5'::jsonb, false,
   'Ranking: how much growth against 7 days ago lifts a score; growth counts up to doubling (S1-E15-05).'),
  ('ranking_place_show_up_to', '100'::jsonb, false,
   'Story page: a ranking place is shown only up to this place in the category (S1-E15-05).')
on conflict (key) do nothing;

/* ---------- 1. The extra signals ---------- */

/**
 * story_more_signals: each readable story's decayed follows, finished-chapter points and growth.
 * Returns one row per story with follows, finish_points (finished chapters × reading minutes,
 *   230 words a minute, at least 1 and at most 60 minutes a chapter) and growth (0 to 1: the share
 *   the stored score rose against the snapshot 7 days ago, capped at doubling).
 * Rules: the writer's own follow never counts (as their own likes, S1-E5-03); deleted accounts
 *   don't count.
 * Internal: compute_story_scores().
 */
create function public.story_more_signals()
returns table (story_id uuid, follows double precision, finish_points double precision,
  growth double precision)
language sql stable security definer set search_path = ''
as $$
  with window_start as (
    select now() - make_interval(days => public.ranking_setting('ranking_window_days', 60)::integer) as since,
      public.ranking_setting('ranking_half_life_days', 7) as half_life,
      (now() at time zone 'Europe/Bucharest')::date as today
  ),
  readable as materialized (
    select * from public.readable_chapters_for_ranking()
  ),
  stories_ranked as (
    select distinct readable.story_id, readable.user_id from readable
  ),
  follow_points as (
    select follows.story_id, sum(power(0.5,
      extract(epoch from now() - follows.created_at) / 86400 / window_start.half_life)) as points
    from stories_ranked cross join window_start
    join public.follows_stories as follows on follows.story_id = stories_ranked.story_id
      and follows.user_id <> stories_ranked.user_id
    join public.profiles on profiles.id = follows.user_id and profiles.deleted_at is null
    where follows.created_at >= window_start.since
    group by follows.story_id
  ),
  finished as (
    select readable.story_id, sum(finishes.total
      * least(60.0, greatest(1.0, coalesce(chapters.published_word_count, 0) / 230.0))
      * power(0.5, (window_start.today - finishes.read_on) / window_start.half_life)) as points
    from readable cross join window_start
    join public.chapters on chapters.id = readable.id
    join public.chapter_finishes as finishes on finishes.chapter_id = readable.id
    where finishes.read_on >= (window_start.since at time zone 'Europe/Bucharest')::date
    group by readable.story_id
  ),
  rise as (
    select story_scores.story_id,
      least(1.0, greatest(0.0, (story_scores.score - week_ago.score) / week_ago.score)) as ratio
    from public.story_scores cross join window_start
    join public.story_rank_snapshots as week_ago on week_ago.story_id = story_scores.story_id
      and week_ago.snapshot_on = window_start.today - 7
    where week_ago.score > 0
  )
  select stories_ranked.story_id, coalesce(follow_points.points, 0),
    coalesce(finished.points, 0), coalesce(rise.ratio, 0)
  from stories_ranked
  left join follow_points on follow_points.story_id = stories_ranked.story_id
  left join finished on finished.story_id = stories_ranked.story_id
  left join rise on rise.story_id = stories_ranked.story_id;
$$;
comment on function public.story_more_signals() is
  'Internal: each readable story''s decayed follows, finished-chapter points and 7-day growth (S1-E15-05).';
revoke execute on function public.story_more_signals() from public, anon, authenticated;

/**
 * compute_story_scores: as in S1-E5-03 and S1-E4-05, with follows and finished chapters added to
 * the sum and growth lifting it (S1-E15-05). Never downvotes.
 * Returns how many stories were scored.
 */
create or replace function public.compute_story_scores()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  reads_weight double precision := public.ranking_setting('ranking_weight_reads', 1);
  likes_weight double precision := public.ranking_setting('ranking_weight_likes', 5);
  comments_weight double precision := public.ranking_setting('ranking_weight_comments', 8);
  shares_weight double precision := public.ranking_setting('ranking_weight_shares', 10);
  through_weight double precision := public.ranking_setting('ranking_weight_read_through', 0.5);
  follows_weight double precision := public.ranking_setting('ranking_weight_follows', 6);
  finishes_weight double precision := public.ranking_setting('ranking_weight_finishes', 2);
  growth_weight double precision := public.ranking_setting('ranking_weight_growth', 0.5);
  scored integer;
begin
  -- Step 1: a score for every readable story: the weighted sum, lifted by read-through and growth.
  insert into public.story_scores (story_id, score, computed_at)
  select signals.story_id,
    greatest(0, (signals.reads * reads_weight + signals.likes * likes_weight
      + signals.comments * comments_weight + coalesce(shares.points, 0) * shares_weight
      + coalesce(more.follows, 0) * follows_weight + coalesce(more.finish_points, 0) * finishes_weight)
      * (1 + signals.read_through * through_weight)
      * (1 + coalesce(more.growth, 0) * growth_weight)),
    now()
  from public.story_signals() as signals
  left join public.story_share_points() as shares on shares.story_id = signals.story_id
  left join public.story_more_signals() as more on more.story_id = signals.story_id
  on conflict (story_id) do update set score = excluded.score, computed_at = excluded.computed_at;
  get diagnostics scored = row_count;

  -- Step 2: a story with no readable chapter left drops out of the scores.
  delete from public.story_scores
  where not public.story_has_readable_chapter(story_scores.story_id);
  return scored;
end;
$$;
comment on function public.compute_story_scores() is
  'Hourly: each story''s popularity score from reads, likes, comments, shares, follows, finished chapters, read-through and growth, never downvotes (S1-E5-03, S1-E4-05, S1-E15-05).';

/* ---------- 2. The place ---------- */

/**
 * story_rank_place: a story's place in its category, "#3 in Fantasy".
 * Input: story_slug.
 * Returns: {place, category_slug}, or null when the story has no score, is past
 *   ranking_place_show_up_to (100), or the caller may not see it.
 * Rules: the place counts only stories every reader could find in a list: a readable chapter,
 *   not hidden by moderators, not class-only and not unlisted. Whether the caller may see the
 *   story follows get_story_page() (rating, moderation, blocks); staff who may view stories always
 *   may. Errors: none.
 * Where it fits: useRankingPlace (story page) and the staff story page.
 */
create function public.story_rank_place(story_slug text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  story public.stories;
  own_score double precision;
  place integer;
begin
  -- Step 1: the story, which the caller may see.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return null;
  end if;
  if not public.staff_may('stories', 'view') and (
       not public.rating_allows(story.rating)
       or public.is_moderated_away('story', story.id)
       or public.is_blocked_with(story.user_id)) then
    return null;
  end if;
  -- Step 2: its score, if it is a story every reader could find.
  if story.class_only or story.visibility <> 'public' then
    return null;
  end if;
  select story_scores.score into own_score from public.story_scores where story_scores.story_id = story.id;
  if own_score is null or own_score <= 0 then
    return null;
  end if;
  -- Step 3: one more than the findable stories in the category with a higher score.
  select 1 + count(*)::integer into place
  from public.story_scores
  join public.stories as others on others.id = story_scores.story_id
  where others.category_id = story.category_id and others.deleted_at is null
    and story_scores.score > own_score
    and not others.class_only and others.visibility = 'public'
    and not public.is_moderated_away('story', others.id);
  if place > public.ranking_setting('ranking_place_show_up_to', 100) then
    return null;
  end if;
  return jsonb_build_object('place', place,
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id));
end;
$$;
comment on function public.story_rank_place(text) is
  'A story''s place in its category by score, up to place 100, for anyone who may see it and for staff (S1-E15-05).';
revoke execute on function public.story_rank_place(text) from public;
grant execute on function public.story_rank_place(text) to anon, authenticated;
