-- QA-2a: story lists, search and cards stay fast at 50,000 accounts (independent QA check,
-- 5 Nov 2026, findings S1 and S2; fix bundle QA-2).
--
-- What was slow, measured on the volume seed (scripts/volume/, 20,000 stories, 200,000 chapters):
-- Discover, every list and search took over 30 seconds. Three causes:
-- 1. story_card_json() counted a card's chapters with a filter Postgres couldn't use an index
--    for, so each card tested all 200,000 chapters (36 s per card).
-- 2. listed_stories() asked six security definer functions about every story, one story at a
--    time (readable chapter, moderation, restriction, rating, block, list membership), and
--    browse_stories() ran the whole list twice: once to count, once for the page.
-- 3. Search built each story's search text from scratch for every story, with no index at all.
--
-- What it does:
-- - story_card_json(), profile_story_cards() and public_plan_json() filter chapters by the raw
--   story ID, so the chapters index is used.
-- - listed_stories() asks the same questions once per call, for the whole list together: the
--   ratings the caller may see (rating_allows() on each of the four, so the rule stays in one
--   place), the people blocked either way, and the moderation and restriction tables as joins.
--   The rules are the same as before, line for line; database tests 151, 177, 179 and the rest
--   prove it, and scripts/volume/ times it.
-- - browse_stories() reads the list once and counts it in the same pass.
-- - story_search_documents keeps each story's search text and its word index, updated by
--   triggers whenever a title, blurb, writer name, tag or classic author changes. Search uses a
--   GIN index on the words and a trigram index on the folded text (for "strengari" finding
--   "ștrengari" inside a word), so it no longer reads every story.
-- Who calls it: Discover and every story list and search screen (browse_stories), the writer
-- profile (profile_story_cards), the public plan (public_plan_json) and every card.

/* ---------- 1. Cards: count chapters through the index (S1) ---------- */

/**
 * story_card_json: one story as a card on a list or shelf.
 * Inputs: target_story_id.
 * Returns: the card (title, writer, rating, cover, readable chapter count and so on) as the caller
 *   may see it, with a hidden title or cover masked (S1-E11-08); null when there is no such story.
 * Raises: nothing.
 * Where it fits: browse_stories(), shelves, libraries and search (S1-E5-01).
 */
create or replace function public.story_card_json(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', stories.id,
    'slug', stories.slug,
    'title', stories.title,
    'blurb', stories.blurb,
    'writer', jsonb_build_object(
      'handle', profiles.handle,
      'display_name', public.story_writer_name(stories.id, profiles.handle, profiles.pen_name),
      'classic_author', public.story_classic_author(stories.id),
      -- IDEAS-3a: the writer's rank for the card's pill, when the reader may see it.
      'rank', public.story_card_writer_rank(profiles, stories.id)),
    'category_slug', categories.slug,
    'language_code', stories.language_code,
    'completion_status', stories.completion_status,
    'rating', stories.rating,
    'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
      'background', stories.cover_background, 'accent', stories.cover_accent),
    -- QA-2a: only published, undeleted chapters can be readable, and saying so lets Postgres
    -- read just this story's chapters through chapters_published_idx.
    'chapter_count', (select count(*) from public.chapters
      where chapters.story_id = target_story_id
        and chapters.status = 'published' and chapters.deleted_at is null
        and public.chapter_is_readable(chapters.id)),
    'last_chapter_published_at', stories.last_chapter_published_at)
  -- S1-E11-08: the story as the caller may see it (a hidden title or cover masked). In FROM, so
  -- story_as_shown() runs once, not once per column ("(story_as_shown(raw)).*", QA-2a).
  from public.stories as raw
  cross join lateral public.story_as_shown(raw) as stories
  join public.profiles on profiles.id = stories.user_id
  join public.categories on categories.id = stories.category_id
  where raw.id = target_story_id;
$$;

/**
 * profile_story_cards: the stories on a writer's profile.
 * Inputs: writer_id; is_owner, true when the writer is looking at their own profile.
 * Returns: a JSON array of small cards, newest chapter first, each story as the caller may see
 *   it (a hidden title or cover masked, S1-E11-08).
 * Raises: nothing.
 * Where it fits: get_writer_profile() (S1-E5-05).
 */
create or replace function public.profile_story_cards(writer_id uuid, is_owner boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', stories.id,
      'slug', stories.slug,
      'title', stories.title,
      'blurb', stories.blurb,
      'category_slug', categories.slug,
      'completion_status', stories.completion_status,
      'rating', stories.rating,
      'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
        'background', stories.cover_background, 'accent', stories.cover_accent),
      -- QA-2a: only published, undeleted chapters can be readable; saying so lets Postgres use
      -- chapters_published_idx.
      'chapter_count', (select count(*) from public.chapters
        where chapters.story_id = raw.id
          and chapters.status = 'published' and chapters.deleted_at is null
          and public.chapter_is_readable(chapters.id)),
      'last_chapter_published_at', stories.last_chapter_published_at
    ) order by stories.last_chapter_published_at desc nulls last, stories.title), '[]'::jsonb)
  -- S1-E11-08: each story as the caller may see it (a hidden title or cover masked).
  from public.stories as raw
  cross join lateral (select (public.story_as_shown(raw)).*) as stories
  join public.categories on categories.id = stories.category_id
  where raw.user_id = writer_id
    and raw.deleted_at is null
    and public.story_has_readable_chapter(raw.id)
    and not public.is_moderated_away('story', raw.id)
    and (is_owner or public.rating_allows(raw.rating))
    -- S1-E8-11: a class-only story isn't on the writer's public profile.
    and (is_owner or not raw.class_only)
    -- NEW-1: unlisted and private stories aren't on the writer's public profile.
    and (is_owner or raw.visibility = 'public');
$$;

/* ---------- 2. Search: each story's search text, kept and indexed (S2) ---------- */

create extension if not exists pg_trgm with schema extensions;

/**
 * Table story_search_documents: one row per story, holding what search looks through.
 * Why: building every story's search text for every search read all 20,000 stories each time.
 * Kept by refresh_story_search_document(), which the triggers below call whenever something in
 * the text changes. Personal data: the writer's handle and pen name, as on the public story page.
 * It holds no user content beyond what the story page already shows, and no user ID column of
 * its own: it belongs to the story (deleted with it).
 */
create table public.story_search_documents (
  story_id uuid primary key references public.stories (id) on delete cascade,
  -- search_fold() of the title (unless staff hid it), blurb, handle, pen name, classic author
  -- and approved tags in every language: story_search_text().
  search_text text not null default '',
  -- The Romanian and English word index of search_text.
  document tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.story_search_documents is
  'kind: platform. Each story''s folded search text and word index, kept by triggers (QA-2a; search S1-E5-04).';

create index story_search_documents_words on public.story_search_documents using gin (document);
create index story_search_documents_text_trigram
  on public.story_search_documents using gin (search_text extensions.gin_trgm_ops);

alter table public.story_search_documents enable row level security;

/**
 * Policy story_search_documents_select_staff: staff who may view stories read the search rows.
 * Why: everyone else searches through browse_stories(), which applies the rating, block and
 * visibility rules; a direct read would skip them. Only the triggers write.
 */
create policy story_search_documents_select_staff
  on public.story_search_documents
  for select
  to authenticated
  using ((select public.staff_may('stories', 'view')));

comment on policy story_search_documents_select_staff on public.story_search_documents is
  'Allows staff who may view stories to read the search rows; members search through browse_stories() (QA-2a).';

revoke all on public.story_search_documents from anon, authenticated;
grant select on public.story_search_documents to authenticated;

/**
 * refresh_story_search_document: rebuilds one story's search row.
 * Inputs: target_story_id.
 * Returns: nothing. A story that no longer exists is skipped (its row went with it).
 * Raises: nothing.
 * Where it fits: the triggers below, and rebuild_story_search_documents().
 */
create or replace function public.refresh_story_search_document(target_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  folded text;
begin
  -- Step 1: the same text search has always used (story_search_text(), S1-E5-04).
  folded := coalesce(public.story_search_text(target_story_id), '');
  -- Step 2: keep it with its Romanian and English word index.
  insert into public.story_search_documents (story_id, search_text, document)
  select stories.id, folded,
         to_tsvector('pg_catalog.romanian', folded) || to_tsvector('pg_catalog.english', folded)
  from public.stories where stories.id = target_story_id
  on conflict (story_id) do update
    set search_text = excluded.search_text, document = excluded.document, updated_at = now();
end;
$$;

comment on function public.refresh_story_search_document(uuid) is
  'Rebuilds one story''s search row from story_search_text() (QA-2a).';
revoke all on function public.refresh_story_search_document(uuid) from public, anon, authenticated;

/**
 * rebuild_story_search_documents: rebuilds every story's search row.
 * Returns: how many stories were done.
 * Where it fits: this migration's backfill and scripts/volume/seed-volume.sql, which loads with
 *   triggers off. Safe to run again at any time.
 */
create or replace function public.rebuild_story_search_documents()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  done integer := 0;
  story_row record;
begin
  for story_row in select id from public.stories loop
    perform public.refresh_story_search_document(story_row.id);
    done := done + 1;
  end loop;
  return done;
end;
$$;

comment on function public.rebuild_story_search_documents() is
  'Rebuilds every story''s search row; safe to run again (QA-2a).';
revoke all on function public.rebuild_story_search_documents() from public, anon, authenticated;

/* ---------- The triggers that keep the search rows up to date ---------- */

/**
 * story_search_from_story: a story was added, or a part of its search text changed.
 * Where it fits: trigger story_search_on_story_change on stories.
 */
create or replace function public.story_search_from_story()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_story_search_document(new.id);
  return null;
end;
$$;
revoke all on function public.story_search_from_story() from public, anon, authenticated;

create trigger story_search_on_story_change
  after insert or update of title, blurb, title_hidden_at, user_id, classic_author_id
  on public.stories
  for each row execute function public.story_search_from_story();

/**
 * story_search_from_profile: a writer changed their handle or pen name; refresh their stories.
 * Where it fits: trigger story_search_on_profile_change on profiles.
 */
create or replace function public.story_search_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_row record;
begin
  for story_row in select id from public.stories where stories.user_id = new.id loop
    perform public.refresh_story_search_document(story_row.id);
  end loop;
  return null;
end;
$$;
revoke all on function public.story_search_from_profile() from public, anon, authenticated;

create trigger story_search_on_profile_change
  after update of handle, pen_name on public.profiles
  for each row
  when (old.handle is distinct from new.handle or old.pen_name is distinct from new.pen_name)
  execute function public.story_search_from_profile();

/**
 * story_search_from_story_tag: a tag was added to or taken off a story.
 * Where it fits: trigger story_search_on_story_tag_change on story_tags.
 */
create or replace function public.story_search_from_story_tag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_story_search_document(new.story_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.refresh_story_search_document(old.story_id);
  end if;
  return null;
end;
$$;
revoke all on function public.story_search_from_story_tag() from public, anon, authenticated;

create trigger story_search_on_story_tag_change
  after insert or update or delete on public.story_tags
  for each row execute function public.story_search_from_story_tag();

/**
 * story_search_from_tag: a tag's name, status or translations changed; refresh its stories.
 * Where it fits: triggers on tags and tag_names.
 */
create or replace function public.story_search_from_tag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_tag_id uuid;
  story_row record;
begin
  -- Step 1: which tag (tags.id, or tag_names.tag_id).
  if tg_table_name = 'tags' then
    changed_tag_id := coalesce(new.id, old.id);
  elsif tg_op = 'DELETE' then
    changed_tag_id := old.tag_id;
  else
    changed_tag_id := new.tag_id;
  end if;
  -- Step 2: every story that carries it.
  for story_row in select story_id from public.story_tags where story_tags.tag_id = changed_tag_id loop
    perform public.refresh_story_search_document(story_row.story_id);
  end loop;
  return null;
end;
$$;
revoke all on function public.story_search_from_tag() from public, anon, authenticated;

create trigger story_search_on_tag_change
  after update of name, status on public.tags
  for each row execute function public.story_search_from_tag();
create trigger story_search_on_tag_name_change
  after insert or update or delete on public.tag_names
  for each row execute function public.story_search_from_tag();

/**
 * story_search_from_classic_author: a classic author's name changed; refresh their stories.
 * Where it fits: trigger story_search_on_classic_author_change on classic_authors.
 */
create or replace function public.story_search_from_classic_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_row record;
begin
  for story_row in select id from public.stories where stories.classic_author_id = new.id loop
    perform public.refresh_story_search_document(story_row.id);
  end loop;
  return null;
end;
$$;
revoke all on function public.story_search_from_classic_author() from public, anon, authenticated;

create trigger story_search_on_classic_author_change
  after update of name on public.classic_authors
  for each row execute function public.story_search_from_classic_author();

-- The backfill: every story that exists now.
select public.rebuild_story_search_documents();

/* ---------- 3. Search reads the kept rows ---------- */

/**
 * story_search_document: a story's Romanian and English word index.
 * Inputs: target_story_id.
 * Returns: the kept index (story_search_documents), or one built on the spot for a story that
 *   has no row yet; null for a story that doesn't exist.
 * Where it fits: story_search_rank() and story_matches_search() (S1-E5-04).
 */
create or replace function public.story_search_document(target_story_id uuid)
returns tsvector
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select documents.document from public.story_search_documents as documents
     where documents.story_id = target_story_id),
    (select to_tsvector('pg_catalog.romanian', document.text) || to_tsvector('pg_catalog.english', document.text)
     from (select coalesce(public.story_search_text(target_story_id), '') as text) as document));
$$;

/**
 * story_matches_search: does one story answer a search term?
 * Inputs: target, the story row; term, what the reader typed.
 * Returns: true when the term (2 characters or more once folded) matches a word of the story's
 *   search text or appears inside it ("strengari" inside "ștrengari"), from the kept row.
 * Where it fits: list_holds_story() for one story; whole lists use the indexes directly
 *   (listed_stories()).
 */
create or replace function public.story_matches_search(target public.stories, term text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select char_length(public.search_fold(term)) >= 2 and exists (
    select 1 from public.story_search_documents as documents
    where documents.story_id = target.id
      and (documents.document @@ public.search_query(term)
           or documents.search_text like public.search_like_pattern(term)));
$$;

/* ---------- 4. Lists: every rule asked once per call (S2) ---------- */

/**
 * listed_stories: the stories one list holds for the caller.
 * Inputs: list_kind (popular, new, category, search and so on), list_key (the category, tag,
 *   writer, search term or shelf), and optional category, completion and language filters.
 * Returns: the stories, each as the caller may see it (story_as_shown(), S1-E11-08).
 * Raises: nothing; browse_stories() checks the inputs first.
 * Where it fits: browse_stories() and the shelves and libraries that list stories.
 * The rules, unchanged from NEW-1 and earlier (only how they are asked changed, QA-2a):
 *   not deleted; at least one published chapter not removed by moderators; the story not removed;
 *   class-only stories only for their writer (S1-E8-11); visibility per story_listing_allows
 *   (NEW-1); restricted stories only in libraries and the writer's own lists (S1-E11-08); and,
 *   unless it is the caller's own story, a rating the caller may see and nobody blocked either
 *   way (CLAUDE.md rules 18 and 6); then the list's own membership rule.
 */
create or replace function public.listed_stories(list_kind text, list_key text, category_slug text,
  completion public.completion_status, language text)
returns setof public.stories
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    and (list_kind in ('library', 'reader_library', 'writer')
         or stories.user_id = caller_id
         or not exists (
           select 1 from public.story_restrictions
           where story_restrictions.story_id = stories.id and story_restrictions.lifted_at is null))
    -- CLAUDE.md rules 18 and 6: the rating, and blocks, unless it is the caller's own story.
    and (stories.user_id = caller_id
         or (stories.rating = any (allowed_ratings) and not (stories.user_id = any (blocked_ids))))
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    and (language is null or stories.language_code = language)
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
$$;

/**
 * browse_stories: one page of a story list, and how many the list holds.
 * Inputs: list_kind and list_key (see listed_stories()), optional category, completion and
 *   language filters, sort_order (the list's default when null), page_size (1 to 60, default
 *   21) and page_offset.
 * Returns: {"total": number, "stories": [card, …]} in the chosen order.
 * Raises: invalid_parameter_value for an unknown list or sort, a list without its key, or a
 *   negative offset.
 * Where it fits: Discover, See all, category, tag, writer and search pages (S1-E5-01, S1-E5-04,
 *   S1-E5-09), through src/features/discovery/api.
 */
create or replace function public.browse_stories(list_kind text, list_key text default null,
  category_slug text default null, completion public.completion_status default null,
  language text default null, sort_order text default null, page_size integer default 21,
  page_offset integer default 0)
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
  -- For "relevance": the term as a word query and as a pattern, worked out once.
  search_terms tsquery := case when list_kind = 'search' then public.search_query(list_key) end;
  search_pattern text := case when list_kind = 'search' then public.search_like_pattern(list_key) end;
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
  return jsonb_build_object('total', total, 'stories', page);
end;
$$;

/* ---------- 5. One story by its address ---------- */

/**
 * reader_visible_story: the story at an address, when the caller may open it.
 * Inputs: story_slug.
 * Returns: the story as the caller may see it (story_as_shown(), S1-E11-08), or no row.
 * The rules are unchanged: not deleted or moderated away; class-only stories for their writer and
 *   class (S1-E8-11); private stories for their writer, unlisted for anyone with the link
 *   (NEW-1); and, unless it is the caller's own, a rating they may see and no block either way.
 * Where it fits: get_story_page(), get_chapter() and every reader function (S1-E4-01a).
 * QA-2a: story_as_shown() moved into FROM so it runs once rather than once per column.
 */
create or replace function public.reader_visible_story(story_slug text)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select shown.* from public.stories
  cross join lateral public.story_as_shown(stories) as shown
  where stories.slug = story_slug
    and stories.deleted_at is null
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a story shared only with a class opens only for its writer and that class.
    and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
    -- NEW-1: a private story opens only for its writer; an unlisted one for anyone with the link.
    and public.story_visibility_allows(stories.visibility, stories.user_id)
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    );
$$;
