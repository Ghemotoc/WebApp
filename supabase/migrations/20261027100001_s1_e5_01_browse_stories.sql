/*
 * Migration: the story lists behind Discover, category and tag pages (story S1-E5-01; boards 3.1
 * and 3.10).
 *
 * What it adds:
 * - story_card_json(story_id): one story as a card, the same shape every list answers: address,
 *   title, blurb, the writer's username and display name, category, language, status, rating,
 *   cover, chapter count and last update. Never a user ID (CLAUDE.md rule 15).
 * - listed_stories(...): the stories one list holds, with every reader rule in one place: only
 *   published stories with a chapter readers can open, nothing deleted or moderated away, nothing
 *   rated above the reader's age (rating_allows(): a visitor sees All ages and 13+, rule 18), and
 *   nothing by a writer either side blocks (S1-E5-05). The writer always sees their own.
 * - browse_stories(...): one page of a list and its total, for a shelf (21 rows tell it there are
 *   more than 20) or a See all page (S1-E5-09).
 * The lists (list_kind): updated (recently updated), new (newest first published), completed,
 * category (list_key = the category's slug), tag (list_key = the tag), following (writers the
 * caller follows) and writer (list_key = a username: the profile's See all).
 * No reading history is used to fill any list (the story's legal note; S1-E5-09).
 * No new table, so no new policy: everything is read through these functions (ADR 0004).
 * Who calls it: src/features/discovery/api/storyLists.ts.
 * Tests: supabase/tests/database/151-browse-stories.test.sql.
 */

/* ---------- One story as a card ---------- */

/**
 * story_card_json: one story as every list draws it.
 * Input: target_story_id. Returns: JSON {id (the story's, for the automatic cover), slug, title,
 *   blurb, writer {handle, display_name}, category_slug, language_code, completion_status, rating,
 *   cover {kind, design, background, accent}, chapter_count (readable chapters only),
 *   last_chapter_published_at}. Never the writer's user ID.
 * Internal: browse_stories().
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
      'display_name', public.display_name(profiles.handle, profiles.pen_name)),
    'category_slug', categories.slug,
    'language_code', stories.language_code,
    'completion_status', stories.completion_status,
    'rating', stories.rating,
    'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
      'background', stories.cover_background, 'accent', stories.cover_accent),
    'chapter_count', (select count(*) from public.chapters
      where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)),
    'last_chapter_published_at', stories.last_chapter_published_at)
  from public.stories
  join public.profiles on profiles.id = stories.user_id
  join public.categories on categories.id = stories.category_id
  where stories.id = target_story_id;
$$;
comment on function public.story_card_json(uuid) is
  'Internal: one story as a card in a list, never a user ID (S1-E5-01).';
revoke execute on function public.story_card_json(uuid) from public, anon, authenticated;

/* ---------- Which stories a list holds ---------- */

/**
 * list_holds_story: whether a story belongs to a list, before the reader's rules.
 * Inputs: the story, list_kind and list_key (see the header).
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
comment on function public.list_holds_story(public.stories, text, text) is
  'Internal: does a story belong to a list, before the reader''s rules (S1-E5-01).';
revoke execute on function public.list_holds_story(public.stories, text, text) from public, anon, authenticated;

/**
 * listed_stories: the stories in a list that this reader may see, after the filters.
 * Inputs: list_kind, list_key; the filters category_slug, completion and language (null for any).
 * Returns: the stories, unordered.
 * Rules: published with a chapter readers can open; not deleted; not moderated away
 *   (is_moderated_away(), S1-E10-06); for anyone but the writer, rated for the reader's age
 *   (rating_allows(), CLAUDE.md rule 18) and not by someone either side blocks (S1-E5-05).
 * Internal: browse_stories().
 */
create or replace function public.listed_stories(
  list_kind text,
  list_key text,
  category_slug text,
  completion public.completion_status,
  language text
)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select stories.* from public.stories
  join public.categories on categories.id = stories.category_id
  where stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    )
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    and (language is null or stories.language_code = language)
    and public.list_holds_story(stories, list_kind, list_key);
$$;
comment on function public.listed_stories(text, text, text, public.completion_status, text) is
  'Internal: the stories in a list this reader may see, after the filters (S1-E5-01).';
revoke execute on function public.listed_stories(text, text, text, public.completion_status, text)
  from public, anon, authenticated;

/* ---------- One page of a list ---------- */

/**
 * browse_stories: one page of a story list and how many it holds.
 * Inputs: list_kind (updated, new, completed, category, tag, following or writer); list_key (the
 *   category slug, the tag or the username, for those kinds); the filters category_slug,
 *   completion ('ongoing' or 'completed') and language (a code such as 'ro'), null for any;
 *   sort_order (null for the list's own order: newest first published for 'new', recently
 *   updated for the rest; S1-E5-02 adds the reader's choices); page_size (1 to 60, default 21,
 *   so a shelf knows there are more than 20); page_offset (0 for the first page).
 * Returns: JSON {total, stories: [story_card_json(), ...]}. The following list is empty for a
 *   visitor.
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
  ordering text := coalesce(sort_order, case when list_kind = 'new' then 'newest' else 'updated' end);
  total integer;
  page jsonb;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or list_kind not in ('updated', 'new', 'completed', 'category', 'tag', 'following', 'writer') then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('updated', 'newest') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 2: how many the list holds for this reader, for "24 stories" and "View all 24".
  select count(*) into total from public.listed_stories(list_kind, list_key, category_slug, completion, language);
  -- Step 3: the page, in order; ties go to the newer story, then the address, so pages never overlap.
  select coalesce(jsonb_agg(public.story_card_json(ordered.id) order by ordered.position), '[]'::jsonb) into page
  from (
    select listed.id, row_number() over (order by
        case when ordering = 'updated' then listed.last_chapter_published_at end desc nulls last,
        listed.first_published_at desc nulls last,
        listed.slug) as position
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed
    order by position
    limit wanted_rows offset coalesce(page_offset, 0)
  ) as ordered;
  return jsonb_build_object('total', total, 'stories', page);
end;
$$;
comment on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer) is
  'One page of a story list (Discover shelves, category, tag and See all pages) with its total (S1-E5-01).';
revoke execute on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer)
  from public;
grant execute on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer)
  to anon, authenticated;
