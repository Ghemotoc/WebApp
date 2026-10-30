/**
 * Migration: search stories, writers and tags (story S1-E5-04; board Search 3.2).
 *
 * What it adds:
 * - search_fold(): the one form search compares: lower case, accents and marks removed, ş and ţ
 *   corrected (normalise_tag()), so "povesti" finds "povești" (second criterion).
 * - search_query(): the typed words as a full-text query, stemmed in Romanian and in English, so
 *   "povestea" finds "povești" and "stories" finds "story" (first criterion).
 * - story_search_document(): what a story is found by: its title, blurb, every name of its approved
 *   tags, its writer's username and pen name, and a classic's real author.
 * - The list kind 'search' (list_holds_story()) and the sort 'relevance' (browse_stories()), the
 *   default for search: a story found by its title comes first, then the closest matches. Search
 *   results are an ordinary story list, so they go through listed_stories(): ratings, blocks,
 *   drafts and moderation are left out exactly as on every other list (third criterion), and the
 *   See all page with its filters works unchanged (fourth criterion).
 * - search_writers() and search_tags(): the other two groups. A writer is found only when the
 *   reader may see at least one of their stories, so search never lists readers' accounts (minors
 *   among them) who don't publish; tags are approved ones with a story the reader may see.
 * No index yet: each search reads the stories it may show, which is fine at Stage 1's size. Once
 *   there are thousands of stories, a stored tsvector column with a GIN index replaces
 *   story_search_document() (follow-up).
 * Who calls it: src/features/search/api/search.ts and src/features/discovery/api/storyLists.ts.
 * Tests: supabase/tests/database/177-search.test.sql, e2e/search.spec.ts.
 */

/* ---------- The words ---------- */

/**
 * search_fold: text in the one form search compares.
 * Input: any text. Returns: trimmed, spaces collapsed, lower case, without accents or marks.
 * Internal: every function below.
 */
create or replace function public.search_fold(raw_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select public.normalise_tag(raw_text);
$$;
comment on function public.search_fold(text) is 'Internal: text in the form search compares, without diacritics (S1-E5-04).';
revoke execute on function public.search_fold(text) from public, anon, authenticated;

/**
 * search_query: the typed words as a full-text query in both languages.
 * Input: the search term as typed. Returns: the Romanian query OR the English one, each with every
 *   word required ("dragoni sinaia" needs both words); an empty query for an empty term.
 * Internal: story_matches_search() and story_search_rank().
 */
create or replace function public.search_query(term text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select websearch_to_tsquery('pg_catalog.romanian', public.search_fold(term))
    || websearch_to_tsquery('pg_catalog.english', public.search_fold(term));
$$;
comment on function public.search_query(text) is 'Internal: a search term stemmed in Romanian and English (S1-E5-04).';
revoke execute on function public.search_query(text) from public, anon, authenticated;

/**
 * search_like_pattern: a term as a "contains" pattern, with % and _ taken literally.
 * Input: the term. Returns: '%<folded term>%'.
 * Internal: titles, names and tags that contain the term (a word typed only in part).
 */
create or replace function public.search_like_pattern(term text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '%' || replace(replace(replace(public.search_fold(term), '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;
comment on function public.search_like_pattern(text) is 'Internal: a search term as a literal "contains" pattern (S1-E5-04).';
revoke execute on function public.search_like_pattern(text) from public, anon, authenticated;

/**
 * story_search_text: everything a story is found by, folded, as one text.
 * Input: target_story_id. Returns: the title, blurb, every name of its approved tags (in every
 *   language), the writer's username and pen name, and a classic's real author.
 * Internal: story_matches_search() and story_search_rank().
 */
create or replace function public.story_search_text(target_story_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.search_fold(concat_ws(' ',
    stories.title, stories.blurb, profiles.handle, profiles.pen_name,
    public.story_classic_author(stories.id) ->> 'name',
    (select string_agg(concat_ws(' ', tags.name,
        (select string_agg(tag_names.name, ' ') from public.tag_names where tag_names.tag_id = tags.id)), ' ')
     from public.story_tags join public.tags on tags.id = story_tags.tag_id
     where story_tags.story_id = stories.id and tags.status = 'approved')))
  from public.stories join public.profiles on profiles.id = stories.user_id
  where stories.id = target_story_id;
$$;
comment on function public.story_search_text(uuid) is 'Internal: what a story is found by, folded (S1-E5-04).';
revoke execute on function public.story_search_text(uuid) from public, anon, authenticated;

/**
 * story_search_document: a story's search text, stemmed in Romanian and in English.
 * Input: target_story_id. Returns: the tsvector.
 * Internal: story_matches_search() and story_search_rank().
 */
create or replace function public.story_search_document(target_story_id uuid)
returns tsvector
language sql
stable
security definer
set search_path = ''
as $$
  select to_tsvector('pg_catalog.romanian', document.text) || to_tsvector('pg_catalog.english', document.text)
  from (select coalesce(public.story_search_text(target_story_id), '') as text) as document;
$$;
comment on function public.story_search_document(uuid) is 'Internal: a story''s words for full-text search (S1-E5-04).';
revoke execute on function public.story_search_document(uuid) from public, anon, authenticated;

/**
 * story_matches_search: whether a story answers a search.
 * Inputs: the story and the term. Returns: true when the stemmed words match, or the folded text
 *   contains the term as typed (a word typed only in part, such as "radi"); false for a term of
 *   fewer than 2 letters.
 * Internal: list_holds_story()'s 'search' list.
 */
create or replace function public.story_matches_search(target public.stories, term text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select char_length(public.search_fold(term)) >= 2 and (
    public.story_search_document(target.id) @@ public.search_query(term)
    or public.story_search_text(target.id) like public.search_like_pattern(term));
$$;
comment on function public.story_matches_search(public.stories, text) is 'Internal: whether a story answers a search (S1-E5-04).';
revoke execute on function public.story_matches_search(public.stories, text) from public, anon, authenticated;

/**
 * story_search_rank: how well a story answers a search, for the 'relevance' sort.
 * Inputs: the story and the term. Returns: 2 when its title contains the term, plus the
 *   full-text rank (0 to 1), so a story found by its title comes before one found by its blurb.
 * Internal: browse_stories().
 */
create or replace function public.story_search_rank(target public.stories, term text)
returns real
language sql
stable
security definer
set search_path = ''
as $$
  select (case when public.search_fold(target.title) like public.search_like_pattern(term) then 2 else 0 end)
    + ts_rank(public.story_search_document(target.id), public.search_query(term));
$$;
comment on function public.story_search_rank(public.stories, text) is 'Internal: how well a story answers a search (S1-E5-04).';
revoke execute on function public.story_search_rank(public.stories, text) from public, anon, authenticated;

/* ---------- Search as a story list ---------- */

/**
 * list_holds_story: whether a story belongs to a list, before the reader's rules.
 * As in CMS-1e, plus 'search' (S1-E5-04): the stories that answer the term in list_key.
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
    -- CMS-1e: the tag a name stands for in any language ("fantezie" is Fantasy), approved only.
    when 'tag' then exists (
      select 1 from public.story_tags
      where story_tags.story_id = target.id and story_tags.tag_id = public.tag_for_name(list_key))
    when 'following' then exists (
      select 1 from public.follows_users
      where follows_users.user_id = (select auth.uid()) and follows_users.followed_user_id = target.user_id)
    when 'writer' then target.user_id = (select profile.id from public.profile_for_handle(list_key) as profile)
    -- S1-E5-04: the stories that answer the search term.
    when 'search' then public.story_matches_search(target, list_key)
    else false
  end;
$$;

/**
 * list_default_sort: a list's own order, when the reader hasn't picked one.
 * As in S1-E5-03, plus 'relevance' for search (S1-E5-04).
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
    when 'search' then 'relevance'
    else 'popular'
  end;
$$;

/**
 * browse_stories: one page of a story list and how many it holds.
 * Inputs: as in S1-E5-03; list_kind adds 'search' (list_key is the term) and sort_order adds
 *   'relevance' (only for search: the best match first; S1-E5-04).
 * Returns: JSON {total, stories: [story_card_json(), ...]}.
 * Errors: invalid_parameter_value for an unknown list_kind or sort_order, a missing list_key,
 *   'relevance' on a list that isn't a search, or a negative page_offset.
 * Where it fits: every shelf on Discover, every See all page and the search page's stories.
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
  if list_kind is null or list_kind not in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag', 'following', 'writer', 'search') then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer', 'search') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('popular', 'updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer', 'relevance')
      or (ordering = 'relevance' and list_kind <> 'search') then
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
        case when ordering = 'relevance' then public.story_search_rank(listed, list_key) end desc,
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
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed
    join public.profiles on profiles.id = listed.user_id
    left join public.story_scores as scores on scores.story_id = listed.id
    order by position
    limit wanted_rows offset coalesce(page_offset, 0)
  ) as ordered;
  return jsonb_build_object('total', total, 'stories', page);
end;
$$;

/* ---------- Writers and tags ---------- */

/**
 * search_writers: the writers whose username or pen name answers a search.
 * Inputs: term; page_size (1 to 60, default 21, so a shelf knows there are more than 20);
 *   page_offset.
 * Returns: JSON {total, writers: [{handle, display_name, bio, story_count}]}: never the user ID
 *   (architecture 1.6). Only writers with a story this reader may see: so no reader's account,
 *   nobody on either side of a block, nothing a moderator hid. Best match first (the username or
 *   pen name starts with the term), then the most stories, then the username.
 * Errors: invalid_parameter_value for a negative page_offset.
 * Where it fits: the search page's Writers group and its See all page (src/features/search/).
 */
create or replace function public.search_writers(term text, page_size integer default 21, page_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  folded text := public.search_fold(term);
  total integer;
  page jsonb;
begin
  -- Step 1: a term of at least 2 letters and a page that starts at 0 or later.
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first writer.' using errcode = 'invalid_parameter_value';
  end if;
  if char_length(folded) < 2 then
    return jsonb_build_object('total', 0, 'writers', '[]'::jsonb);
  end if;
  -- Step 2: the writers of the stories this reader may see, whose names contain the term; then
  -- the count and one page, best match first.
  with found_writers as (
    select profiles.handle, public.display_name(profiles.handle, profiles.pen_name) as display_name,
      profiles.bio, count(*)::integer as story_count,
      (public.search_fold(profiles.handle) like folded || '%'
        or public.search_fold(profiles.pen_name) like folded || '%') as starts_with
    from public.listed_stories('popular', null, null, null, null) as visible
    join public.profiles on profiles.id = visible.user_id
    where not public.is_moderated_away('profile', profiles.id)
      and (public.search_fold(profiles.handle) like public.search_like_pattern(term)
        or public.search_fold(profiles.pen_name) like public.search_like_pattern(term))
    group by profiles.id
  ),
  ordered as (
    select found_writers.*, row_number() over (order by found_writers.starts_with desc,
      found_writers.story_count desc, found_writers.handle) as position
    from found_writers
  )
  select (select count(*)::integer from found_writers),
    coalesce((select jsonb_agg(jsonb_build_object('handle', ordered.handle, 'display_name', ordered.display_name,
        'bio', ordered.bio, 'story_count', ordered.story_count) order by ordered.position)
      from ordered where ordered.position > coalesce(page_offset, 0)
        and ordered.position <= coalesce(page_offset, 0) + wanted_rows), '[]'::jsonb)
  into total, page;
  return jsonb_build_object('total', total, 'writers', page);
end;
$$;
comment on function public.search_writers(text, integer, integer) is
  'Writers whose username or pen name answers a search, with a story the reader may see (S1-E5-04).';
grant execute on function public.search_writers(text, integer, integer) to anon, authenticated;

/**
 * search_tags: the approved tags whose name, in any language, answers a search.
 * Inputs: term; page_size (1 to 60, default 21); page_offset.
 * Returns: JSON {total, tags: [{name, story_count}]}: name is the tag's stored name (the app shows it
 *   in the reader's language); story_count counts the stories this reader may see, and a tag with
 *   none is left out. Most stories first, then the name.
 * Errors: invalid_parameter_value for a negative page_offset.
 * Where it fits: the search page's Tags group and its See all page (src/features/search/).
 */
create or replace function public.search_tags(term text, page_size integer default 21, page_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  total integer;
  page jsonb;
begin
  -- Step 1: a term of at least 2 letters and a page that starts at 0 or later.
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first tag.' using errcode = 'invalid_parameter_value';
  end if;
  if char_length(public.search_fold(term)) < 2 then
    return jsonb_build_object('total', 0, 'tags', '[]'::jsonb);
  end if;
  -- Step 2: approved tags with a matching name in any language, counted over the visible stories;
  -- then the count and one page.
  with found_tags as (
    select tags.name, count(*)::integer as story_count
    from public.tags
    join public.story_tags on story_tags.tag_id = tags.id
    join public.listed_stories('popular', null, null, null, null) as visible on visible.id = story_tags.story_id
    where tags.status = 'approved'
      and (tags.normalised_name like public.search_like_pattern(term)
        or exists (select 1 from public.tag_names
          where tag_names.tag_id = tags.id and tag_names.normalised_name like public.search_like_pattern(term)))
    group by tags.id, tags.name
  ),
  ordered as (
    select found_tags.*, row_number() over (order by found_tags.story_count desc, found_tags.name) as position
    from found_tags
  )
  select (select count(*)::integer from found_tags),
    coalesce((select jsonb_agg(jsonb_build_object('name', ordered.name, 'story_count', ordered.story_count)
        order by ordered.position)
      from ordered where ordered.position > coalesce(page_offset, 0)
        and ordered.position <= coalesce(page_offset, 0) + wanted_rows), '[]'::jsonb)
  into total, page;
  return jsonb_build_object('total', total, 'tags', page);
end;
$$;
comment on function public.search_tags(text, integer, integer) is
  'Approved tags whose name in any language answers a search, with the stories the reader may see (S1-E5-04).';
grant execute on function public.search_tags(text, integer, integer) to anon, authenticated;
