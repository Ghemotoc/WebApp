/**
 * Migration: who can read a story: Public, Unlisted or Private (bundle NEW-1, part a; Robert,
 * 2 Nov 2026, 21:51 to 21:54).
 *
 * The rule, in short:
 * - Public: as before.
 * - Unlisted works like an unlisted video: out of Discover, shelves, search, tags and the writer's
 *   public profile, but anyone with the link opens it, and signed-in readers save, like and
 *   comment as usual. It stays in the library of anyone who saved it; on someone else's public
 *   library it shows only to viewers who saved or follow it themselves. Only the people who follow
 *   the story itself hear of a new chapter, never the writer's followers.
 * - Private: only the writer sees it, even after chapters are published. Nobody is told of a new
 *   chapter.
 * Staff Restrict and Hide (S1-E11-08) sit on top and always win; ratings, blocks, reporting and
 * moderation apply as for a public story. Class-only stories (S1-E8-11) stay a class setting.
 * The "App only" switch (S1-E3-08) comes with the apps, not here.
 *
 * What it adds:
 *   enum story_visibility and stories.visibility (public by default);
 *   story_visibility_allows()   the reading gate: private opens only for the writer;
 *   story_listing_allows()      the listing gate: unlisted only in libraries;
 *   set_my_story_visibility()   the writer's own setting.
 * What it changes, so the gates hold on every path: chapter_is_readable(),
 *   story_has_readable_chapter() and reader_visible_story() (every reading path, comment, like,
 *   follow and share goes through them), story_cover_picture(), listed_stories() (every list,
 *   search, tag page and library), profile_story_cards() and notify_chapter_published().
 * Who calls it: src/features/writing/api/stories.ts (the setting) and every reading screen.
 */

/* ---------- The setting ---------- */

create type public.story_visibility as enum ('public', 'unlisted', 'private');
comment on type public.story_visibility is
  'Who can read a story: everyone, anyone with the link, or only the writer (NEW-1).';

alter table public.stories
  add column visibility public.story_visibility not null default 'public';
comment on column public.stories.visibility is
  'kind: setting. Who can read the story: public, unlisted (link only, in no list) or private (the writer only) (NEW-1).';

/* ---------- The two gates ---------- */

/**
 * story_visibility_allows: whether the caller may open a story, as far as its visibility goes.
 * Internal. Inputs: the story's visibility and writer. Returns true for public and unlisted
 * stories, and for a private one only when the caller wrote it. Errors: none.
 * Where it fits: every reading path below.
 */
create or replace function public.story_visibility_allows(
  story_visibility public.story_visibility,
  writer_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select story_visibility <> 'private' or writer_id = (select auth.uid());
$$;
comment on function public.story_visibility_allows(public.story_visibility, uuid) is
  'Internal: a private story opens only for its writer (NEW-1).';
revoke execute on function public.story_visibility_allows(public.story_visibility, uuid) from public, anon, authenticated;

/**
 * story_listing_allows: whether a list may show a story, as far as its visibility goes. Internal.
 * Inputs: the story and the kind of list (listed_stories()).
 * Returns: true for a public story and for the caller's own; for an unlisted one, only on the
 *   caller's own library shelves, or on someone else's library when the caller saved or follows
 *   that story too; false for anything private that isn't the caller's.
 * Errors: none. Where it fits: listed_stories().
 */
create or replace function public.story_listing_allows(target public.stories, list_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.visibility = 'public'
    or target.user_id = (select auth.uid())
    or (target.visibility = 'unlisted' and (
      list_kind = 'library'
      or (list_kind = 'reader_library' and (
        exists (select 1 from public.library_entries
                where library_entries.user_id = (select auth.uid()) and library_entries.story_id = target.id)
        or exists (select 1 from public.follows_stories
                   where follows_stories.user_id = (select auth.uid()) and follows_stories.story_id = target.id)))));
$$;
comment on function public.story_listing_allows(public.stories, text) is
  'Internal: unlisted stories show only in libraries, private ones nowhere but the writer''s own (NEW-1).';
revoke execute on function public.story_listing_allows(public.stories, text) from public, anon, authenticated;

/**
 * set_my_story_visibility: the writer chooses who can read their story.
 * Inputs: the story's slug and 'public', 'unlisted' or 'private'.
 * Returns: {"outcome": "ok"}, {"outcome": "not_found"} for a story that isn't the caller's, or
 *   {"outcome": "not_active"} for an account that may not write.
 * Errors: insufficient_privilege when signed out; invalid_text_representation for an unknown value.
 * Where it fits: Story settings › Who can read it (StoryVisibilitySection).
 */
create or replace function public.set_my_story_visibility(story_slug text, wanted public.story_visibility)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  -- Step 1: a signed-in writer who may write, and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: save it. Staff Restrict and Hide are kept apart and still win (S1-E11-08).
  update public.stories set visibility = wanted where stories.id = target_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.set_my_story_visibility(text, public.story_visibility) is
  'The writer sets who can read their story: public, unlisted or private (NEW-1).';
revoke execute on function public.set_my_story_visibility(text, public.story_visibility) from public, anon;
grant execute on function public.set_my_story_visibility(text, public.story_visibility) to authenticated;

/* ---------- Every path, with the gates ---------- */

/* chapter_is_readable */
create or replace function public.chapter_is_readable(chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.id = chapter_id
      and chapters.status = 'published'
      and chapters.deleted_at is null
      and stories.deleted_at is null
      and not public.is_moderated_away('chapter', chapters.id)
      and not public.is_moderated_away('story', stories.id)
      -- S1-E8-11: a story shared only with a class opens only for its writer and that class.
      and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
      -- NEW-1: a private story opens only for its writer.
      and public.story_visibility_allows(stories.visibility, stories.user_id)
  );
$$;

/* story_has_readable_chapter */
create or replace function public.story_has_readable_chapter(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.story_id = target_story_id
      -- S1-E8-11: a story shared only with a class counts only for its writer and that class.
      and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
      -- NEW-1: a private story opens only for its writer.
      and public.story_visibility_allows(stories.visibility, stories.user_id)
      and chapters.status = 'published'
      and chapters.deleted_at is null
      and not public.is_moderated_away('chapter', chapters.id)
  );
$$;

/* reader_visible_story */
create or replace function public.reader_visible_story(story_slug text)
returns SETOF stories
language sql
stable
security definer
set search_path = ''
as $$
  select (public.story_as_shown(stories)).* from public.stories
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

/* story_cover_picture */
create or replace function public.story_cover_picture(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks)
  from public.stories
  join public.picture_checks on picture_checks.bucket = 'covers' and picture_checks.path = stories.cover_tall_path
  where stories.slug = story_slug and stories.cover_kind = 'upload' and stories.deleted_at is null
    and (stories.user_id = (select auth.uid())
         or (stories.first_published_at is not null and public.rating_allows(stories.rating)
             -- S1-E8-11: a class-only story's cover shows only to that class.
             and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
             -- NEW-1: a private story's cover shows only to its writer.
             and stories.visibility <> 'private'
             -- S1-E11-08: a hidden cover shows only to staff who may open stories.
             and (stories.cover_hidden_at is null or public.staff_may('stories', 'view'))));
$$;

/* listed_stories */
create or replace function public.listed_stories(list_kind text, list_key text, category_slug text, completion completion_status, language text)
returns SETOF stories
language sql
stable
security definer
set search_path = ''
as $$
  select (public.story_as_shown(stories)).* from public.stories
  join public.categories on categories.id = stories.category_id
  where stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a class-only story is in no public list, only on its class's page.
    and (not stories.class_only or stories.user_id = (select auth.uid()))
    -- NEW-1: unlisted stories are in no public list, only in libraries (story_listing_allows()).
    and public.story_listing_allows(stories, list_kind)
    -- S1-E11-08: a restricted story still opens, but no list promotes it.
    and (list_kind in ('library', 'reader_library', 'writer')
         or stories.user_id = (select auth.uid())
         or not public.is_story_restricted(stories.id))
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    )
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    and (language is null or stories.language_code = language)
    and public.list_holds_story(stories, list_kind, list_key);
$$;

/* profile_story_cards */
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
      'chapter_count', (select count(*) from public.chapters
        where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)),
      'last_chapter_published_at', stories.last_chapter_published_at
    ) order by stories.last_chapter_published_at desc nulls last, stories.title), '[]'::jsonb)
  -- S1-E11-08: each story as the caller may see it (a hidden title or cover masked).
  from (select (public.story_as_shown(raw)).* from public.stories as raw
        where raw.user_id = writer_id) as stories
  join public.categories on categories.id = stories.category_id
  where stories.user_id = writer_id
    and stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    and (is_owner or public.rating_allows(stories.rating))
    -- S1-E8-11: a class-only story isn't on the writer's public profile.
    and (is_owner or not stories.class_only)
    -- NEW-1: unlisted and private stories aren't on the writer's public profile.
    and (is_owner or stories.visibility = 'public');
$$;

/* notify_chapter_published */
create or replace function public.notify_chapter_published(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  story public.stories;
  follower_id uuid;
begin
  select * into story from public.stories where stories.id = (payload ->> 'story_id')::uuid;
  -- NEW-1: a private story tells nobody.
  if story.id is null or story.visibility = 'private' then
    return;
  end if;
  for follower_id in
    -- NEW-1: the writer's followers hear only of public stories; an unlisted story tells only
    -- the people who follow that story.
    select follows_users.user_id from public.follows_users
    where follows_users.followed_user_id = story.user_id and story.visibility = 'public'
    union
    select follows_stories.user_id from public.follows_stories where follows_stories.story_id = story.id
  loop
    -- S1-E8-11: a chapter of a class-only story tells only followers who are in that class, so
    -- nobody else learns its title.
    if story.class_only and not exists (
      select 1 from public.space_members
      where space_members.space_id = story.class_space_id
        and space_members.user_id = follower_id
        and space_members.status = 'active'
    ) then
      continue;
    end if;
    perform public.notify(follower_id, 'new_chapter', story.user_id,
      jsonb_build_object('story_id', story.id, 'chapter_id', payload ->> 'chapter_id'));
  end loop;
end;
$$;
