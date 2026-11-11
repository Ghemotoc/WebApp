-- Migration: the languages a member reads (bundle MARKETS-2, part c; IDEA-20261109-2).
--
-- What it does:
-- 1. profiles.reading_languages: the story languages a member picked in Settings › Language ›
--    Reading languages. Null means "not picked", and the app then uses the interface language plus
--    English. Only the member reads it (profiles_select_own); it is never shown to anyone else.
-- 2. set_my_reading_languages(): saves the pick, checked against the story languages; an empty
--    pick goes back to the default.
-- 3. listed_stories(): its language filter takes one code or several, separated by commas
--    ("sv,en"), so Discover, Trending, the genre pages and See all can show stories in the
--    languages someone reads without a second version of browse_stories(). Everything else in the
--    function is unchanged (copied from …_gaps6_reading_lists.sql).
-- Who calls it: src/features/language/api/readingLanguages.ts (Settings) and
-- src/features/discovery/api/storyLists.ts (the lists).
-- Privacy: a reading language is a preference, not sensitive data; it stays on the account and goes
-- with it (docs/retention.md). Signed-out visitors' choice is never stored (the language menu).

/* ---------- 1. The column ---------- */

alter table public.profiles
  add column reading_languages text[],
  -- At most ten codes, each a BCP 47 code like the languages table's (the setter checks they exist).
  add constraint profiles_reading_languages_shape check (
    reading_languages is null
    or (cardinality(reading_languages) between 1 and 10
        and array_to_string(reading_languages, ',') ~ '^[a-z]{2,3}(-[A-Z]{2})?(,[a-z]{2,3}(-[A-Z]{2})?)*$'));

comment on column public.profiles.reading_languages is
  'The story languages the member reads (MARKETS-2c); null means the interface language plus English. Private to the member.';

/* ---------- 2. Saving the pick ---------- */

/**
 * set_my_reading_languages(): saves the story languages the signed-in member reads.
 *
 * @param wanted - the language codes; null or empty goes back to the default (interface + English)
 * @returns the saved codes, in the order given without repeats, or null for the default
 * Errors: insufficient_privilege when signed out; check_violation (hint unknown_language) for a
 *   code that isn't a story language, and (hint too_many) for more than ten.
 * Where it fits: Settings › Language › Reading languages → this → profiles.reading_languages, which
 *   the app reads to filter the lists (listed_stories()).
 */
create function public.set_my_reading_languages(wanted text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cleaned text[];
begin
  -- Step 1: a signed-in member.
  if me is null then
    raise exception 'Sign in to choose the languages you read.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: drop repeats and blanks, keeping the order given.
  select array_agg(code order by first_position) into cleaned
  from (
    select btrim(code) as code, min(position) as first_position
    from unnest(coalesce(wanted, '{}')) with ordinality as given(code, position)
    where btrim(code) <> ''
    group by btrim(code)) as unique_codes;
  -- Step 3: nothing picked means the default.
  if cleaned is null then
    update public.profiles set reading_languages = null where id = me;
    return null;
  end if;
  if cardinality(cleaned) > 10 then
    raise exception 'Pick up to ten languages.' using errcode = 'check_violation', hint = 'too_many';
  end if;
  -- Step 4: every code must be a language stories can be written in (the languages table).
  if exists (select 1 from unnest(cleaned) as picked(picked_code)
             where not exists (select 1 from public.languages where languages.code = picked.picked_code)) then
    raise exception 'That isn''t a story language.' using errcode = 'check_violation', hint = 'unknown_language';
  end if;
  update public.profiles set reading_languages = cleaned where id = me;
  return cleaned;
end;
$$;

comment on function public.set_my_reading_languages(text[]) is
  'A member saves the story languages they read; empty goes back to the default (MARKETS-2c).';

revoke execute on function public.set_my_reading_languages(text[]) from public, anon;
grant execute on function public.set_my_reading_languages(text[]) to authenticated;

/* ---------- 3. The lists' language filter takes several codes ---------- */

/**
 * listed_stories(): the stories in a list this reader may see, after the filters (S1-E5-01,
 * GAPS-6). Unchanged except the language filter: one code, or several separated by commas
 * (MARKETS-2c), so a list can hold the stories in any of the languages someone reads.
 */
create or replace function public.listed_stories(list_kind text, list_key text, category_slug text,
  completion public.completion_status, language text)
returns setof public.stories
language plpgsql
stable
security definer
set search_path = ''
as $_$
declare
  caller_id uuid := (select auth.uid());
  -- The ratings this caller may see, from rating_allows() itself, asked once per rating.
  allowed_ratings public.story_rating[] := array(
    select rating from unnest(enum_range(null::public.story_rating)) as rating
    where public.rating_allows(rating));
  -- Everyone the caller blocked or who blocked the caller (CLAUDE.md rule 6).
  blocked_ids uuid[] := array(
    select blocks.blocked_user_id from public.blocks where blocks.user_id = caller_id
    union
    select blocks.user_id from public.blocks where blocks.blocked_user_id = caller_id);
  is_search boolean := list_kind = 'search';
  -- GAPS-6: a reading list's ID, so its few stories are found through the list's own index
  -- instead of asking every story whether it is in the list. Null for every other list.
  reading_list_id uuid := case
    when list_kind = 'reading_list'
      and list_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then list_key::uuid end;
  -- MARKETS-2c: the language filter as a list of codes ("sv,en"), or null for every language.
  wanted_languages text[] := case when language is not null then string_to_array(language, ',') end;
  search_terms tsquery;
  search_pattern text;
begin
  -- Step 1: for a search, the stories that answer it, found through the two indexes.
  if is_search then
    if char_length(public.search_fold(list_key)) < 2 then
      return;
    end if;
    search_terms := public.search_query(list_key);
    search_pattern := public.search_like_pattern(list_key);
  end if;

  -- Step 2: the list, with each rule as a join or a test on the whole set.
  -- story_as_shown() sits in FROM, so it runs once per story: written as
  -- "(story_as_shown(stories)).*" it ran once per column, about forty times per story.
  return query
  select shown.*
  from public.stories
  join public.categories on categories.id = stories.category_id
  cross join lateral public.story_as_shown(stories) as shown
  where stories.deleted_at is null
    -- At least one published chapter that moderators haven't removed (story_has_readable_chapter()).
    and exists (
      select 1 from public.chapters
      where chapters.story_id = stories.id
        and chapters.status = 'published'
        and chapters.deleted_at is null
        and not exists (
          select 1 from public.moderated_items
          where moderated_items.item_type = 'chapter' and moderated_items.item_id = chapters.id
            and moderated_items.restored_at is null))
    -- The story itself isn't removed or hidden by moderators (is_moderated_away()).
    and not exists (
      select 1 from public.moderated_items
      where moderated_items.item_type = 'story' and moderated_items.item_id = stories.id
        and moderated_items.restored_at is null)
    -- S1-E8-11: a class-only story is in no public list, only on its class's page.
    and (not stories.class_only or stories.user_id = caller_id)
    -- NEW-1: unlisted stories are in no public list, only in libraries (story_listing_allows()).
    -- A public story always passes, so that common case is answered without the function.
    and (stories.visibility = 'public' or public.story_listing_allows(stories, list_kind))
    -- S1-E11-08: a restricted story still opens, but no list promotes it.
    and (list_kind in ('library', 'reader_library', 'writer', 'reading_list')
         or stories.user_id = caller_id
         or not exists (
           select 1 from public.story_restrictions
           where story_restrictions.story_id = stories.id and story_restrictions.lifted_at is null))
    -- CLAUDE.md rules 18 and 6: the rating, and blocks, unless it is the caller's own story.
    and (stories.user_id = caller_id
         or (stories.rating = any (allowed_ratings) and not (stories.user_id = any (blocked_ids))))
    -- GAPS-6: for a reading list, only the stories in it are looked at.
    and (list_kind <> 'reading_list' or stories.id in (
          select entries.story_id from public.reading_list_stories as entries
          where entries.list_id = reading_list_id))
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    -- MARKETS-2c: one language or several (the languages someone reads).
    and (wanted_languages is null or stories.language_code = any (wanted_languages))
    -- The list's own rule: the three open lists hold every story; search uses the indexes; the
    -- rest ask list_holds_story().
    and (
      list_kind in ('updated', 'new', 'popular')
      or (is_search and stories.id in (
            select documents.story_id from public.story_search_documents as documents
            where documents.document @@ search_terms or documents.search_text like search_pattern))
      or (list_kind not in ('updated', 'new', 'popular', 'search')
          and public.list_holds_story(stories, list_kind, list_key)));
end;
$_$;
