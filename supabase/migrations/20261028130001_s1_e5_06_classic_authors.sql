-- Migration: classics show their real author (part of S1-E5-06; Robert, 25 Oct 2026: "they should
-- be categorised as classics, but the name of the writers ... should be the real writers").
--
-- What it adds:
--   classic_authors       the real authors of public-domain works (name and year of death); public
--                         reading, no writes yet (staff's "Add a classic work" form, S1-E11-16)
--   stories.classic_author_id   which author wrote a classic; null for everyone's own stories
--   story_writer_name()   the name every byline shows: the real author of a classic, else the
--                         writer's pen name or username
--   story_classic_author() the author for the writer card ({name, died_year}, or null)
--   and new versions of story_card_json(), get_story_page(), get_chapter() and get_link_preview()
--   that use them.
-- Why on the story and not as an account per author: the classics stay owned by the official
--   classics account (a story's owner never changes, architecture 1.6), and nobody can follow,
--   message or log in as a writer who died long ago.
-- Who calls the new pieces: only the functions above (security definer). Who sets the column:
--   the demo top-up today (supabase/staging-topups/classic-authors.sql), the staff form later.
--   Writers can't: stories has no update grant, and create_story() and update_my_story() never touch it.
-- Personal data: none. The names are of authors who died before 1956 (public domain, S1-E5-06).

/* ---------- The authors ---------- */

create table public.classic_authors (
  id uuid primary key default gen_random_uuid(),
  -- The name as readers know it, with its diacritics ("Ion Creangă"); one row per author.
  name text not null unique check (btrim(name) <> '' and char_length(name) <= 120),
  -- Public domain in Romania: life plus 70 years from 1 January after the death (Law 8/1996
  -- art. 28(1) and 34), so in 2026 only authors who died in 1955 or earlier (S1-E5-06).
  died_year integer not null check (died_year between 1 and 1955),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.classic_authors is
  'kind: platform. Real authors of public-domain classics, shown as the byline of their works (S1-E5-06, 25 Oct 2026). Not accounts.';

create trigger classic_authors_set_updated_at
  before update on public.classic_authors
  for each row execute function public.set_updated_at();

alter table public.classic_authors enable row level security;

-- classic_authors_select_everyone: anyone, signed in or not, may read the authors, because every
-- byline of a public classic shows one and they are public figures who died long ago (S1-E5-06).
create policy classic_authors_select_everyone on public.classic_authors
  for select to anon, authenticated
  using (true);
-- No insert, update or delete policy: only migrations and top-ups add authors until the staff
-- form (S1-E11-16) brings an admin_* function that checks the role and writes the audit log.

grant select on public.classic_authors to anon, authenticated;  -- classic_authors_select_everyone

/* ---------- Which author wrote a classic ---------- */

alter table public.stories
  add column classic_author_id uuid references public.classic_authors (id);
comment on column public.stories.classic_author_id is
  'The real author of a public-domain classic, shown as its byline; null for writers'' own stories (S1-E5-06).';
create index stories_classic_author_id_idx on public.stories (classic_author_id)
  where classic_author_id is not null;

/**
 * story_writer_name: the name a story's byline shows.
 * Inputs: target_story_id, the writer's handle and pen name.
 * Returns: the classic's real author when the story has one, else display_name(handle, pen_name).
 * Where it fits: every function that sends a story's writer to the app (below).
 */
create or replace function public.story_writer_name(target_story_id uuid, writer_handle text, writer_pen_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select classic_authors.name
     from public.stories
     join public.classic_authors on classic_authors.id = stories.classic_author_id
     where stories.id = target_story_id),
    public.display_name(writer_handle, writer_pen_name));
$$;
comment on function public.story_writer_name(uuid, text, text) is
  'Internal: a story''s byline, the real author of a classic or the writer''s name (S1-E5-06).';
revoke execute on function public.story_writer_name(uuid, text, text) from public, anon, authenticated;

/**
 * story_classic_author: the real author of a classic, for the writer card.
 * Input: target_story_id. Returns: JSON {name, died_year}, or null when the story isn't a classic.
 * Where it fits: story_card_json(), get_story_page() and get_chapter() (below).
 */
create or replace function public.story_classic_author(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', classic_authors.name, 'died_year', classic_authors.died_year)
  from public.stories
  join public.classic_authors on classic_authors.id = stories.classic_author_id
  where stories.id = target_story_id;
$$;
comment on function public.story_classic_author(uuid) is
  'Internal: a classic''s real author {name, died_year}, or null (S1-E5-06).';
revoke execute on function public.story_classic_author(uuid) from public, anon, authenticated;

/* ---------- Every byline names a classic's real author ---------- */

/**
 * story_card_json: as in S1-E5-01, with the real author of a classic as the writer's name and
 * writer.classic_author {name, died_year} (null for everyone else's stories).
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
      'classic_author', public.story_classic_author(stories.id)),
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

/**
 * get_story_page: as in S1-E5-03, with the real author of a classic as the writer's name and
 * writer.classic_author, so the writer card shows the author instead of Follow and the profile.
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

  -- Step 3: the page, with the real author of a classic, else the writer's pen name or
  -- username, and never the user ID.
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
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle, 'bio', profiles.bio,
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id),
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

/**
 * get_chapter: as in S1-E6-03, with the real author of a classic as the writer's name and
 * writer.classic_author.
 */
create or replace function public.get_chapter(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  chapter public.chapters;
  readable_codes text[];
  place integer;
  text_to_send text;
  teaser_words integer;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  -- Step 2: the chapter, published and not moderated away.
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id;
  if not found or not public.chapter_is_readable(chapter.id) then
    return null;
  end if;
  -- Step 3: its place among the chapters readers can open, for "Chapter n of N" and the arrows.
  select array_agg(others.code order by others.position) into readable_codes
  from public.chapters as others
  where others.story_id = story.id and public.chapter_is_readable(others.id);
  place := array_position(readable_codes, chapter.code);
  -- Step 4: the text: all of it for a signed-in reader, the teaser for a signed-out visitor.
  if caller_id is not null then
    text_to_send := chapter.published_body;
  else
    select coalesce((settings.value #>> '{}')::integer, 600) into teaser_words
    from public.settings where settings.key = 'teaser_length';
    text_to_send := public.teaser_of(chapter.published_body, coalesce(teaser_words, 600));
  end if;
  -- Step 5: the answer.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'slug', story.slug,
      'title', story.title,
      'language_code', story.language_code,
      'writer', (select jsonb_build_object(
          'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
          'handle', profiles.handle,
          'classic_author', public.story_classic_author(story.id))
        from public.profiles where profiles.id = story.user_id)),
    'id', chapter.id,
    'code', chapter.code,
    'title', chapter.published_title,
    'number', place,
    'total', array_length(readable_codes, 1),
    'previous_code', case when place > 1 then readable_codes[place - 1] end,
    'next_code', readable_codes[place + 1],
    'published_at', chapter.first_published_at,
    'edited_at', chapter.edited_at,
    'minutes_to_read', greatest(1, ceil(coalesce(chapter.published_word_count, 0) / 200.0))::integer,
    'is_owner', story.user_id = caller_id,
    'needs_sign_in', caller_id is null,
    'is_teaser', caller_id is null,
    'text_continues', public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send);
end;
$$;

/**
 * get_link_preview: as in S1-E4-04, with the real author of a classic in the preview.
 */
create or replace function public.get_link_preview(story_slug text, chapter_code text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  chapter public.chapters;
  hides_text boolean;
  chapter_part jsonb;
begin
  -- Step 1: a live story with at least one chapter published once, not hidden by a moderator.
  select * into story from public.stories
  where stories.slug = story_slug and stories.deleted_at is null and stories.first_published_at is not null;
  if not found or public.is_moderated_away('story', story.id) then
    return null;
  end if;
  -- Step 2: 16+ and 18+ show nothing beyond the title to visitors who aren't logged in (Q6).
  hides_text := story.rating in ('16_plus', '18_plus');
  -- Step 3: the chapter, when the address names one; it must be readable.
  if chapter_code is not null then
    select * into chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = story.id;
    if not found or not public.chapter_is_readable(chapter.id) then
      return null;
    end if;
    chapter_part := jsonb_build_object('code', chapter.code,
      'title', case when hides_text then null else chapter.published_title end);
  end if;
  -- Step 4: the preview, with the writer's pen name or username and never the user ID.
  return jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'rating', story.rating,
    'language_code', story.language_code,
    'hides_text', hides_text,
    'blurb', case when hides_text then null else story.blurb end,
    'writer', case when hides_text then null else (
      select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name))
      from public.profiles where profiles.id = story.user_id) end,
    'cover', case when hides_text then null else jsonb_build_object(
      'kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent) end,
    'chapter', chapter_part);
end;
$$;
