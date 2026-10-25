/*
 * Migration: popularity ranking and the Discover mix (story S1-E5-03; with the "popular" sort
 * that S1-E5-02 left for this story; board Discover 3.1, Story 3.4).
 *
 * What it adds:
 * - Settings: the ranking weights, the half-life and the window (changed in admin once
 *   S1-E11-03 lands, by migration until then; the next hourly run uses them, no code change);
 *   discover_shelves (which shelves Discover shows and in what order) and rising_writer_days
 *   (how new a writer must be for "New and rising"), both public so the app can read them
 *   (Q46: "we play a bit with the algorithm", without a release).
 * - story_scores: one score per story, worked out by the job. Staff may read it; readers only
 *   ever see the order it gives.
 * - compute_story_scores(): the hourly job. A story's score adds up its reads, likes, comments and
 *   shares over the window, each counted less the older it is (it halves every half-life), and
 *   is lifted by how many readers reach its latest chapter (read-through). The writer's own likes
 *   and comments never count, and private downvotes are never read (S1-E5-03, third criterion).
 *   No signal is about one reader: reads are daily totals (architecture 1.7.9).
 * - browse_stories(): the 'popular' and 'rising' lists and the 'popular' sort, now the default on
 *   every list except New (newest), Recently updated and Following (updated). Ties go to the newer
 *   story (S1-E5-02, third criterion).
 * - get_story_page(): adds the stats row's numbers (likes and comments).
 * No shelf uses a person's reading history (S1-E5-03, fifth criterion).
 * Who calls it: pg_cron; src/features/discovery/api/storyLists.ts; src/features/reading/api/storyPage.ts.
 * Tests: supabase/tests/database/155-story-scores.test.sql, 098-epic-s1-e5.test.sql.
 */

/* ---------- Settings ---------- */

-- The weights are OPEN and will be tuned with real data (S1-E5-03's legal note): these are
-- starting values. Shares count once S1-E4-05 gives them a counter (after March).
insert into public.settings (key, value, is_public, description) values
  ('ranking_weight_reads', '1'::jsonb, false, 'Popularity: points for each chapter read (S1-E5-03).'),
  ('ranking_weight_likes', '5'::jsonb, false, 'Popularity: points for each like, the writer''s own left out (S1-E5-03).'),
  ('ranking_weight_comments', '8'::jsonb, false, 'Popularity: points for each comment, the writer''s own left out (S1-E5-03).'),
  ('ranking_weight_shares', '10'::jsonb, false, 'Popularity: points for each share; no share counter until S1-E4-05 (S1-E5-03).'),
  ('ranking_weight_read_through', '0.5'::jsonb, false,
   'Popularity: how much reaching the latest chapter lifts a score, from 0 (not at all) to 1 (doubles it) (S1-E5-03).'),
  ('ranking_half_life_days', '7'::jsonb, false, 'Popularity: activity counts half as much after this many days (S1-E5-03).'),
  ('ranking_window_days', '60'::jsonb, false, 'Popularity: activity older than this many days isn''t counted (S1-E5-03).'),
  ('rising_writer_days', '90'::jsonb, true,
   'New and rising: writers whose first story came out within this many days (S1-E5-03, Q13 proposal).'),
  ('discover_shelves', '["following", "popular", "rising", "new", "completed", "updated", "categories"]'::jsonb, true,
   'Discover: which shelves show and in what order; "categories" stands for one shelf per category (S1-E5-03, Q46).')
on conflict (key) do nothing;

/* ---------- The scores ---------- */

create table public.story_scores (
  story_id uuid primary key references public.stories (id) on delete cascade,
  score double precision not null default 0,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_scores_not_negative check (score >= 0)
);

comment on table public.story_scores is
  'kind: platform. Each story''s popularity score from the hourly job; readers see only the order (S1-E5-03).';

alter table public.story_scores enable row level security;

-- Who: staff who may view stories. Why: to see why a story sits where it does (the admin site's
-- Stories area); readers never need the number, only the order browse_stories() gives. Writes go
-- only through compute_story_scores(), as the database owner.
create policy story_scores_select_staff on public.story_scores
  for select to authenticated
  using ((select public.staff_may('stories', 'view')));

grant select on public.story_scores to authenticated;

create trigger story_scores_set_updated_at
  before update on public.story_scores
  for each row execute function public.set_updated_at();

/**
 * ranking_setting: one ranking setting as a number.
 * Inputs: the setting's key and the value to use if it is missing. Returns: the number.
 * Internal: compute_story_scores().
 */
create or replace function public.ranking_setting(setting_key text, fallback double precision)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.setting_value(setting_key) #>> '{}')::double precision, fallback);
$$;
comment on function public.ranking_setting(text, double precision) is 'Internal: a ranking setting as a number (S1-E5-03).';
revoke execute on function public.ranking_setting(text, double precision) from public, anon, authenticated;

/**
 * story_signals: each readable story's decayed signals over the ranking window.
 * Returns: one row per story with a readable chapter: reads, likes and comments, each weighted by
 *   0.5 ^ (age in days ÷ half-life), and read_through, the latest chapter's reads over the first
 *   chapter's reads in the window (0 to 1; 0 for a one-chapter story).
 * Rules: the writer's own likes and comments don't count; deleted comments and accounts don't
 *   count; downvotes are never read.
 * Internal: compute_story_scores().
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
  readable as (
    select chapters.id, chapters.story_id, chapters.user_id, chapters.position
    from public.chapters where public.chapter_is_readable(chapters.id)
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
      first_value(readable.id) over (partition by readable.story_id order by readable.position) as first_id,
      last_value(readable.id) over (partition by readable.story_id order by readable.position
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
  'Internal: each readable story''s decayed reads, likes, comments and read-through (S1-E5-03).';
revoke execute on function public.story_signals() from public, anon, authenticated;

/**
 * compute_story_scores: the hourly ranking job.
 * Returns: how many stories got a score.
 * What it does: score = (reads × reads weight + likes × likes weight + comments × comments weight
 *   + shares × shares weight) × (1 + read-through × read-through weight). Shares are 0 until
 *   S1-E4-05 counts them. Stories that are no longer readable lose their score.
 * Where it fits: pg_cron every hour at :13; tests call it directly.
 */
create or replace function public.compute_story_scores()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reads_weight double precision := public.ranking_setting('ranking_weight_reads', 1);
  likes_weight double precision := public.ranking_setting('ranking_weight_likes', 5);
  comments_weight double precision := public.ranking_setting('ranking_weight_comments', 8);
  -- No share counter yet (S1-E4-05, after March): the weight waits for it.
  shares_weight double precision := public.ranking_setting('ranking_weight_shares', 10);
  through_weight double precision := public.ranking_setting('ranking_weight_read_through', 0.5);
  scored integer;
begin
  -- Step 1: a score for every readable story.
  insert into public.story_scores (story_id, score, computed_at)
  select signals.story_id,
    greatest(0, (signals.reads * reads_weight + signals.likes * likes_weight
      + signals.comments * comments_weight + 0 * shares_weight)
      * (1 + signals.read_through * through_weight)),
    now()
  from public.story_signals() as signals
  on conflict (story_id) do update set score = excluded.score, computed_at = excluded.computed_at;
  get diagnostics scored = row_count;

  -- Step 2: a story with no readable chapter left drops out of the scores.
  delete from public.story_scores
  where not public.story_has_readable_chapter(story_scores.story_id);
  return scored;
end;
$$;
comment on function public.compute_story_scores() is
  'Hourly: each story''s popularity score from reads, likes, comments, shares and read-through, never downvotes (S1-E5-03).';
revoke execute on function public.compute_story_scores() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('compute-story-scores', '13 * * * *', 'select public.compute_story_scores();');
select public.compute_story_scores();

/* ---------- The lists ---------- */

/**
 * list_holds_story: whether a story belongs to a list, before the reader's rules.
 * Inputs: the story, list_kind and list_key. New in S1-E5-03: 'popular' (every story; the order
 *   does the work) and 'rising' (stories by writers whose first story came out within
 *   rising_writer_days, so new writers get seen: Q13 proposal).
 * Returns: true when it belongs; false for an unknown kind.
 * Internal: listed_stories().
 */
create or replace function public.list_holds_story(target public.stories, list_kind text, list_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case list_kind
    when 'updated' then true
    when 'new' then true
    when 'popular' then true
    when 'rising' then (
      select min(earlier.first_published_at) from public.stories as earlier
      where earlier.user_id = target.user_id and earlier.deleted_at is null
    ) >= now() - make_interval(days => coalesce(public.setting_value('rising_writer_days') #>> '{}', '90')::integer)
    when 'completed' then target.completion_status = 'completed'
    when 'category' then exists (
      select 1 from public.categories where categories.id = target.category_id and categories.slug = list_key)
    when 'tag' then exists (
      select 1 from public.story_tags join public.tags on tags.id = story_tags.tag_id
      where story_tags.story_id = target.id and tags.normalised_name = public.normalise_tag(list_key))
    when 'following' then exists (
      select 1 from public.follows_users
      where follows_users.user_id = (select auth.uid()) and follows_users.followed_user_id = target.user_id)
    when 'writer' then target.user_id = (select profile.id from public.profile_for_handle(list_key) as profile)
    else false
  end;
$$;

/**
 * list_default_sort: a list's own order, when the reader hasn't picked one.
 * Input: list_kind. Returns: 'newest' for New, 'updated' for Recently updated and Following,
 *   'popular' for every other list (S1-E5-02, first criterion: popularity is the default).
 * Internal: browse_stories().
 */
create or replace function public.list_default_sort(list_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case list_kind
    when 'new' then 'newest'
    when 'updated' then 'updated'
    when 'following' then 'updated'
    else 'popular'
  end;
$$;
comment on function public.list_default_sort(text) is 'Internal: a list''s own order (S1-E5-02, S1-E5-03).';
revoke execute on function public.list_default_sort(text) from public, anon, authenticated;

/**
 * browse_stories: one page of a story list and how many it holds.
 * Inputs: as in S1-E5-01; list_kind adds 'popular' and 'rising'; sort_order adds 'popular' (by
 *   score, highest first) and defaults to the list's own order (list_default_sort()).
 * Returns: JSON {total, stories: [story_card_json(), ...]}.
 * Errors: invalid_parameter_value for an unknown list_kind or sort_order, a missing list_key, or a
 *   negative page_offset.
 * Where it fits: every shelf on Discover and every See all page (src/features/discovery/).
 */
create or replace function public.browse_stories(
  list_kind text,
  list_key text default null,
  category_slug text default null,
  completion public.completion_status default null,
  language text default null,
  sort_order text default null,
  page_size integer default 21,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  ordering text := coalesce(sort_order, public.list_default_sort(list_kind));
  total integer;
  page jsonb;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or list_kind not in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag', 'following', 'writer') then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('popular', 'updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 2: how many the list holds for this reader, for "24 stories" and "View all 24".
  select count(*) into total from public.listed_stories(list_kind, list_key, category_slug, completion, language);
  -- Step 3: the page, in the chosen order. Only one of the sort lines below is switched on (the
  -- others are null for every row); the last two lines break ties: the newer story, then the
  -- address, so pages never overlap. A story the job hasn't scored yet counts as 0.
  select coalesce(jsonb_agg(public.story_card_json(ordered.id) order by ordered.position), '[]'::jsonb) into page
  from (
    select listed.id, row_number() over (order by
        case when ordering = 'popular' then coalesce(scores.score, 0) end desc,
        case when ordering = 'updated' then listed.last_chapter_published_at end desc nulls last,
        case when ordering = 'newest' then listed.first_published_at end desc nulls last,
        case when ordering = 'oldest' then listed.first_published_at end asc nulls last,
        case when ordering = 'title_az' then listed.title collate "ro-x-icu" end asc,
        case when ordering = 'title_za' then listed.title collate "ro-x-icu" end desc,
        case when ordering = 'writer'
          then public.display_name(profiles.handle, profiles.pen_name) collate "ro-x-icu" end asc,
        listed.first_published_at desc nulls last,
        listed.slug) as position
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed
    join public.profiles on profiles.id = listed.user_id
    left join public.story_scores as scores on scores.story_id = listed.id
    order by position
    limit wanted_rows offset coalesce(page_offset, 0)
  ) as ordered;
  return jsonb_build_object('total', total, 'stories', page);
end;
$$;
comment on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer) is
  'One page of a story list (Discover shelves, category, tag and See all pages) with its total, in the reader''s sort; popular by default (S1-E5-01, S1-E5-02, S1-E5-03).';

/* ---------- The story page's numbers ---------- */

/**
 * story_comment_total: how many comments readers can see on a story.
 * Input: target_story_id. Returns: comments on readable chapters that aren't deleted or moderated
 *   away; replies count too.
 * Internal: get_story_page()'s stats.
 */
create or replace function public.story_comment_total(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.comments
  join public.chapters on chapters.id = comments.chapter_id
  where chapters.story_id = target_story_id
    and public.chapter_is_readable(chapters.id)
    and comments.deleted_at is null
    and not public.is_moderated_away('comment', comments.id);
$$;
comment on function public.story_comment_total(uuid) is 'Internal: a story''s visible comment total (S1-E5-03 stats row).';
revoke execute on function public.story_comment_total(uuid) from public, anon, authenticated;

/**
 * get_story_page: a story's public page (S1-E3-05; rules from S1-E3-03, S1-E3-06, S1-E5-05).
 * Input: story_slug. Returns: as before, plus stats {likes, comments}: the story's public like
 *   total (story_like_total(), S1-E6-03) and visible comments, for the stats row (board 3.4).
 *   Null when the reader may not see the story.
 * Where it fits: /s/<story> → useStoryPage → api/storyPage.ts → here.
 */
create or replace function public.get_story_page(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  caller_id uuid := (select auth.uid());
  is_owner boolean;
begin
  -- Step 1: the story, if it exists and isn't deleted.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return null;
  end if;
  is_owner := caller_id is not null and caller_id = story.user_id;

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18), no moderator hid it and neither side blocks the other (S1-E5-05).
  if not is_owner then
    if not public.story_has_readable_chapter(story.id) then
      return null;
    end if;
    if not public.rating_allows(story.rating) then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
    if public.is_blocked_with(story.user_id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the writer's pen name or username and never the user ID.
  return jsonb_build_object(
    'id', story.id,
    'slug', story.slug,
    'title', story.title,
    'blurb', story.blurb,
    'language_code', story.language_code,
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', coalesce((
      select jsonb_agg(tags.name order by story_tags.created_at)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      where story_tags.story_id = story.id), '[]'::jsonb),
    'completion_status', story.completion_status,
    'comments_enabled', story.comments_enabled,
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object('display_name', public.display_name(profiles.handle, profiles.pen_name),
      'handle', profiles.handle, 'bio', profiles.bio) from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    'chapters', public.story_page_chapters(story.id, is_owner),
    'is_owner', is_owner,
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;
