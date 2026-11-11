-- Migration: "Popular in" a country on Discover (bundle MARKETS-2, part d; Robert, 8 Nov 2026,
-- 09:51 UTC, Builder thread).
--
-- What it does:
-- 1. chapter_reads_by_country: how many times each chapter was read each day from each country,
--    by the country on the reader's profile. Totals only, never who read (as chapter_reads). Kept
--    for the ranking window plus a margin, then deleted by the hourly job.
-- 2. popular_in_countries (a public setting): the countries on the "Popular in" drop-down, the
--    eleven launch countries (Robert, 8 Nov 2026). popular_in_minimum_readers (5) and
--    popular_in_minimum_stories (5) hold the two small-number rules.
-- 3. story_country_scores and compute_story_country_scores(): one popularity score per story and
--    country, hourly, from that country's reads, and the likes and comments of members whose
--    profile is in that country. A story with fewer than 5 reads there in the window isn't ranked
--    there, so nobody can guess who read what (the writer stats' "fewer than 5" idea).
-- 4. browse_stories() takes popular_in: a popular list then follows that country's ranking. A
--    country with fewer than 5 ranked stories shows the overall ranking, and the answer's
--    popular_in is null so the page can say so. Ratings, blocks and app-only rules are untouched:
--    they live in listed_stories().
-- 5. record_chapter_read() adds one to the country's total as well.
-- Who calls it: the Discover "Popular in" drop-down and the Popular See all page
-- (src/features/discovery). What it calls next: nothing new.

/* ---------- 1. Reads by country ---------- */

create table public.chapter_reads_by_country (
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  read_on date not null,
  country_code text not null,
  total integer not null default 0,
  primary key (chapter_id, read_on, country_code),
  constraint chapter_reads_by_country_total_not_negative check (total >= 0),
  constraint chapter_reads_by_country_code_is_alpha2 check (country_code ~ '^[A-Z]{2}$')
);

comment on table public.chapter_reads_by_country is
  'kind: platform. How many times each chapter was read each day from each country, by the reader''s profile country: totals only, never who read (MARKETS-2d).';

alter table public.chapter_reads_by_country enable row level security;

-- Who: staff who may view stories. Why: to check a country''s ranking from the admin site.
-- Readers and writers never read it: the writer's own numbers stay in chapter_reads, and the
-- lists show only the order. Writes go only through record_chapter_read() and the hourly job.
create policy chapter_reads_by_country_select_staff on public.chapter_reads_by_country
  for select to authenticated
  using ((select public.staff_may('stories', 'view')));

grant select on public.chapter_reads_by_country to authenticated;

/* ---------- 2. The settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('popular_in_countries', '["GB", "IE", "US", "CA", "AU", "NZ", "SE", "DK", "NO", "RO", "MD"]'::jsonb, true,
   'Discover: the countries on the "Popular in" drop-down, as two-letter codes (MARKETS-2d; the launch countries, Robert, 8 Nov 2026).'),
  ('popular_in_minimum_readers', '5'::jsonb, false,
   'Popular in: a story with fewer reads than this in a country, within the ranking window, isn''t ranked there (MARKETS-2d).'),
  ('popular_in_minimum_stories', '5'::jsonb, false,
   'Popular in: a country with fewer ranked stories than this shows the overall ranking, with a note (MARKETS-2d).')
on conflict (key) do nothing;

/**
 * is_popular_in_country: whether a code is on the "Popular in" list.
 * Inputs: a two-letter country code (upper case). Returns true or false. Errors: none.
 * Where it fits: browse_stories() refuses any other country, so a made-up code can't probe.
 */
create function public.is_popular_in_country(country text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select settings.value ? country from public.settings
                   where settings.key = 'popular_in_countries'
                     and jsonb_typeof(settings.value) = 'array'), false)
    and country ~ '^[A-Z]{2}$';
$$;
comment on function public.is_popular_in_country(text) is
  'Internal: whether a country is on the "Popular in" list (MARKETS-2d).';
revoke execute on function public.is_popular_in_country(text) from public, anon, authenticated;

/* ---------- 3. The scores ---------- */

create table public.story_country_scores (
  story_id uuid not null references public.stories (id) on delete cascade,
  country_code text not null,
  score double precision not null default 0,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_id, country_code),
  constraint story_country_scores_not_negative check (score >= 0),
  constraint story_country_scores_code_is_alpha2 check (country_code ~ '^[A-Z]{2}$')
);

comment on table public.story_country_scores is
  'kind: platform. Each story''s popularity score in each country, from the hourly job; only stories with at least 5 reads there; readers see only the order (MARKETS-2d).';

create index story_country_scores_by_country on public.story_country_scores (country_code, score desc);

alter table public.story_country_scores enable row level security;

-- Who: staff who may view stories. Why: as story_scores, to see why a story sits where it does in
-- a country. Readers never need the number, only the order browse_stories() gives. Writes go only
-- through compute_story_country_scores(), as the database owner.
create policy story_country_scores_select_staff on public.story_country_scores
  for select to authenticated
  using ((select public.staff_may('stories', 'view')));

grant select on public.story_country_scores to authenticated;

create trigger story_country_scores_set_updated_at
  before update on public.story_country_scores
  for each row execute function public.set_updated_at();

/**
 * country_has_ranking: whether a country has enough ranked stories for its own ranking.
 * Inputs: the country code. Returns true when at least popular_in_minimum_stories (5) stories
 * have a score there. Errors: none. Where it fits: browse_stories() falls back to the overall
 * ranking otherwise.
 */
create function public.country_has_ranking(country text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select count(*) >= public.ranking_setting('popular_in_minimum_stories', 5)
  from public.story_country_scores where story_country_scores.country_code = country;
$$;
comment on function public.country_has_ranking(text) is
  'Internal: whether a country has enough ranked stories for its own "Popular in" ranking (MARKETS-2d).';
revoke execute on function public.country_has_ranking(text) from public, anon, authenticated;

/**
 * story_country_signals: each story's activity in each "Popular in" country, inside the ranking
 * window, with the same half-life as story_signals().
 * Inputs: none (reads the settings). Returns story_id, country_code, reads (weighted), raw_reads
 * (the plain count, for the small-number rule), likes, comments and read_through.
 * Errors: none. Where it fits: compute_story_country_scores() turns these into scores.
 * Likes and comments count by the profile country of the member who gave them, read now; the
 * writer's own never count, as in story_signals().
 */
create function public.story_country_signals()
returns table (story_id uuid, country_code text, reads double precision, raw_reads bigint,
  likes double precision, comments double precision, read_through double precision)
language sql stable security definer set search_path = ''
as $$
  with window_start as (
    select now() - make_interval(days => public.ranking_setting('ranking_window_days', 60)::integer) as since,
      public.ranking_setting('ranking_half_life_days', 7) as half_life
  ),
  countries as (
    select jsonb_array_elements_text(settings.value) as code from public.settings
    where settings.key = 'popular_in_countries' and jsonb_typeof(settings.value) = 'array'
  ),
  readable as materialized (
    select * from public.readable_chapters_for_ranking()
  ),
  read_points as (
    select readable.story_id, reads.country_code,
      sum(reads.total * power(0.5,
        ((now() at time zone 'Europe/Bucharest')::date - reads.read_on) / window_start.half_life)) as points,
      sum(reads.total) as raw_total
    from readable cross join window_start
    join public.chapter_reads_by_country as reads on reads.chapter_id = readable.id
    join countries on countries.code = reads.country_code
    where reads.read_on >= (window_start.since at time zone 'Europe/Bucharest')::date
    group by readable.story_id, reads.country_code
  ),
  like_points as (
    select readable.story_id, profiles.country_code, sum(power(0.5,
      extract(epoch from now() - likes.created_at) / 86400 / window_start.half_life)) as points
    from readable cross join window_start
    join public.chapter_likes as likes on likes.chapter_id = readable.id and likes.user_id <> readable.user_id
    join public.profiles on profiles.id = likes.user_id and profiles.deleted_at is null
    join countries on countries.code = profiles.country_code
    where likes.created_at >= window_start.since
    group by readable.story_id, profiles.country_code
  ),
  comment_points as (
    select readable.story_id, profiles.country_code, sum(power(0.5,
      extract(epoch from now() - comments.created_at) / 86400 / window_start.half_life)) as points
    from readable cross join window_start
    join public.comments on comments.chapter_id = readable.id and comments.user_id <> readable.user_id
      and comments.deleted_at is null
    join public.profiles on profiles.id = comments.user_id and profiles.deleted_at is null
    join countries on countries.code = profiles.country_code
    where comments.created_at >= window_start.since
    group by readable.story_id, profiles.country_code
  ),
  chapter_ends as (
    select distinct on (readable.story_id) readable.story_id,
      first_value(readable.id) over (partition by readable.story_id order by readable.chapter_position) as first_id,
      last_value(readable.id) over (partition by readable.story_id order by readable.chapter_position
        rows between unbounded preceding and unbounded following) as last_id
    from readable
  ),
  through as (
    select read_points.story_id, read_points.country_code,
      case when chapter_ends.first_id = chapter_ends.last_id then 0
           else least(1.0, coalesce(
             (select sum(total) from public.chapter_reads_by_country as last_reads, window_start
              where last_reads.chapter_id = chapter_ends.last_id
                and last_reads.country_code = read_points.country_code
                and last_reads.read_on >= (window_start.since at time zone 'Europe/Bucharest')::date)::double precision
             / nullif((select sum(total) from public.chapter_reads_by_country as first_reads, window_start
              where first_reads.chapter_id = chapter_ends.first_id
                and first_reads.country_code = read_points.country_code
                and first_reads.read_on >= (window_start.since at time zone 'Europe/Bucharest')::date), 0), 0))
      end as ratio
    from read_points join chapter_ends on chapter_ends.story_id = read_points.story_id
  )
  -- Only stories read in a country can rank there: reads drive the small-number rule.
  select read_points.story_id, read_points.country_code,
    read_points.points, read_points.raw_total,
    coalesce(like_points.points, 0), coalesce(comment_points.points, 0), coalesce(through.ratio, 0)
  from read_points
  left join like_points on like_points.story_id = read_points.story_id
    and like_points.country_code = read_points.country_code
  left join comment_points on comment_points.story_id = read_points.story_id
    and comment_points.country_code = read_points.country_code
  left join through on through.story_id = read_points.story_id
    and through.country_code = read_points.country_code;
$$;
comment on function public.story_country_signals() is
  'Internal: each story''s reads, likes, comments and read-through in each "Popular in" country (MARKETS-2d).';
revoke execute on function public.story_country_signals() from public, anon, authenticated;

/**
 * compute_story_country_scores: the hourly job for "Popular in".
 * Inputs: none. Returns how many story and country scores it wrote. Errors: none.
 * Step by step: score every story read in a "Popular in" country with the overall weights
 * (shares have no country, so they don't count here); leave out a story with fewer than
 * popular_in_minimum_readers (5) reads there; drop old scores and old daily rows.
 * Where it fits: pg_cron runs it hourly, next to compute_story_scores().
 */
create function public.compute_story_country_scores() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  reads_weight double precision := public.ranking_setting('ranking_weight_reads', 1);
  likes_weight double precision := public.ranking_setting('ranking_weight_likes', 5);
  comments_weight double precision := public.ranking_setting('ranking_weight_comments', 8);
  through_weight double precision := public.ranking_setting('ranking_weight_read_through', 0.5);
  minimum_readers double precision := public.ranking_setting('popular_in_minimum_readers', 5);
  keep_days integer := public.ranking_setting('ranking_window_days', 60)::integer + 7;
  scored integer;
begin
  -- Step 1: this hour's scores, replacing the last hour's in one go.
  delete from public.story_country_scores;
  insert into public.story_country_scores (story_id, country_code, score, computed_at)
  select signals.story_id, signals.country_code,
    greatest(0, (signals.reads * reads_weight + signals.likes * likes_weight
      + signals.comments * comments_weight) * (1 + signals.read_through * through_weight)),
    now()
  from public.story_country_signals() as signals
  -- The small-number rule: fewer than 5 reads in a country and the story doesn't rank there.
  where signals.raw_reads >= minimum_readers;
  get diagnostics scored = row_count;

  -- Step 2: daily rows older than the ranking window (plus a week) are no longer needed.
  delete from public.chapter_reads_by_country
  where chapter_reads_by_country.read_on < (now() at time zone 'Europe/Bucharest')::date - keep_days;
  return scored;
end;
$$;
comment on function public.compute_story_country_scores() is
  'Hourly: each story''s popularity score per "Popular in" country; a story with fewer than 5 reads in a country isn''t ranked there (MARKETS-2d).';
revoke execute on function public.compute_story_country_scores() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('compute-story-country-scores', '17 * * * *',
  'select public.compute_story_country_scores();');

/* ---------- 4. The lists ---------- */

drop function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer);

/**
 * browse_stories: one page of a story list with its total (S1-E5-01, S1-E5-02, S1-E5-03).
 * Inputs: as before, plus popular_in (MARKETS-2d): a country on the "Popular in" list, or null.
 * Returns { total, stories, popular_in }: popular_in is the country whose ranking ordered the
 * list, or null when the list used the overall ranking (no country asked, a sort other than
 * popular, or a country with too few ranked stories).
 * Errors: an unknown list, a list without its key, an unknown sort, a negative offset, or a
 * country not on the list.
 */
create function public.browse_stories(list_kind text, list_key text default null, category_slug text default null,
  completion public.completion_status default null, language text default null,
  sort_order text default null, page_size integer default 21, page_offset integer default 0,
  popular_in text default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  ordering text := coalesce(sort_order, public.list_default_sort(list_kind));
  total integer;
  page jsonb;
  -- For "relevance": the term as a word query and as a pattern, worked out once.
  search_terms tsquery := case when list_kind = 'search' then public.search_query(list_key) end;
  search_pattern text := case when list_kind = 'search' then public.search_like_pattern(list_key) end;
  -- MARKETS-2d: the country whose ranking orders a popular list, or null for the overall one.
  ranked_country text;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or not public.is_story_list_kind(list_kind) then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer', 'search') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('popular', 'updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer', 'relevance', 'shared')
      or (ordering = 'relevance' and list_kind <> 'search')
      or (ordering = 'shared' and list_kind <> 'shared') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 1b (MARKETS-2d): "Popular in" a country. Only a country on the drop-down's list counts;
  -- one with too few ranked stories falls back to the overall ranking (popular_in is then null
  -- in the answer, so the page can say so).
  if popular_in is not null then
    if not public.is_popular_in_country(popular_in) then
      raise exception 'Unknown country.' using errcode = 'invalid_parameter_value';
    end if;
    if ordering = 'popular' and public.country_has_ranking(popular_in) then
      ranked_country := popular_in;
    end if;
  end if;
  -- Step 2: the list once, numbered in the chosen order and counted in the same pass (QA-2a; it
  -- used to be read twice). Only one of the sort lines is switched on (the others are null for
  -- every row); the last two break ties: the newer story, then the address, so pages never
  -- overlap. A story the job hasn't scored yet counts as 0.
  with listed as (
    select * from public.listed_stories(list_kind, list_key, category_slug, completion, language)
  ),
  numbered as (
    select listed.id, count(*) over () as list_total, row_number() over (order by
        -- Relevance, as story_search_rank(): 2 for the term inside the title, plus the word rank,
        -- read from the kept search row instead of building it again for every story.
        case when ordering = 'relevance' then
          (case when public.search_fold(listed.title) like search_pattern then 2 else 0 end)
          + ts_rank(coalesce(documents.document, ''::tsvector), search_terms) end desc,
        -- IDEAS-1e: "Most shared this week", by the last 7 days' chapter shares.
        case when ordering = 'shared' then public.story_shares_this_week(listed.id) end desc,
        -- MARKETS-2d: the country's own ranking first; a story with fewer than 5 readers there
        -- isn't ranked in it and follows, in the overall order.
        case when ranked_country is not null then coalesce(country_scores.score, -1) end desc,
        case when ordering in ('popular', 'relevance') then coalesce(scores.score, 0) end desc,
        case when ordering = 'updated' then listed.last_chapter_published_at end desc nulls last,
        case when ordering = 'newest' then listed.first_published_at end desc nulls last,
        case when ordering = 'oldest' then listed.first_published_at end asc nulls last,
        case when ordering = 'title_az' then listed.title collate "ro-x-icu" end asc,
        case when ordering = 'title_za' then listed.title collate "ro-x-icu" end desc,
        case when ordering = 'writer'
          then public.display_name(profiles.handle, profiles.pen_name) collate "ro-x-icu" end asc,
        listed.first_published_at desc nulls last,
        listed.slug) as position
    from listed
    join public.profiles on profiles.id = listed.user_id
    left join public.story_scores as scores on scores.story_id = listed.id
    left join public.story_country_scores as country_scores
      on ranked_country is not null and country_scores.story_id = listed.id
      and country_scores.country_code = ranked_country
    left join public.story_search_documents as documents
      on ordering = 'relevance' and documents.story_id = listed.id
  ),
  -- Step 3: the page's cards. The total comes from any row; an empty list or a page past the end
  -- counts again below.
  page_rows as (
    select numbered.id, numbered.position, numbered.list_total from numbered
    order by numbered.position
    limit wanted_rows offset coalesce(page_offset, 0)
  )
  select coalesce(jsonb_agg(public.story_card_json(page_rows.id) order by page_rows.position), '[]'::jsonb),
         max(page_rows.list_total)
    into page, total
  from page_rows;
  -- Step 4: a page past the end has no rows to carry the total, so count it (rare).
  if total is null then
    select count(*) into total from public.listed_stories(list_kind, list_key, category_slug, completion, language);
  end if;
  return jsonb_build_object('total', total, 'stories', page, 'popular_in', ranked_country);
end;
$$;
comment on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text) is
  'One page of a story list (Discover shelves, category, tag and See all pages) with its total, in the reader''s sort; popular by default, optionally by one country''s ranking (S1-E5-01, S1-E5-02, S1-E5-03, MARKETS-2d).';
revoke all on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text) from public;
grant execute on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text) to anon, authenticated;

/* ---------- 5. Recording a read ---------- */

/**
 * record_chapter_read: adds one to today's read total for a chapter the caller may read
 * (S1-E4-01a), and since MARKETS-2d to the total for the reader's profile country.
 * Inputs: the story's slug and the chapter's code. Returns true when it counted.
 * Errors: a signed-out caller. Never records who read.
 */
create or replace function public.record_chapter_read(story_slug text, chapter_code text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  read_chapter_id uuid;
begin
  if caller_id is null then
    raise exception 'Sign in to read chapters.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the same rules as get_chapter(); the writer's own reads are left out.
  select * into story from public.reader_visible_story(story_slug);
  if not found or story.user_id = caller_id then
    return false;
  end if;
  select chapters.id into read_chapter_id from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id
    and public.chapter_is_readable(chapters.id);
  if read_chapter_id is null then
    return false;
  end if;
  -- Step 2: one more on today's total (the Romanian date, Q7); nothing about the reader is kept.
  insert into public.chapter_reads (chapter_id, read_on, total)
  values (read_chapter_id, (now() at time zone 'Europe/Bucharest')::date, 1)
  on conflict (chapter_id, read_on) do update set total = public.chapter_reads.total + 1;
  -- Step 3 (MARKETS-2d): the same one on the day's total for the reader's country (the country on
  -- their profile), for "Popular in". Still a total only: no reader is kept.
  insert into public.chapter_reads_by_country (chapter_id, read_on, country_code, total)
  select read_chapter_id, (now() at time zone 'Europe/Bucharest')::date, profiles.country_code, 1
  from public.profiles
  where profiles.id = caller_id and profiles.country_code is not null
  on conflict (chapter_id, read_on, country_code)
    do update set total = public.chapter_reads_by_country.total + 1;
  return true;
end;
$$;
