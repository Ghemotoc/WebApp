/*
 * Migration: poem mode for chapters (bundle MUST-2; IDEA-20261106-1, priority Must; story S1-E3-02).
 *
 * How it works: a writer switches a chapter to poem mode in the chapter editor. The editor then
 * keeps every line break, the blank line between stanzas and the spaces a line starts with
 * (stored as non-breaking spaces, which Markdown keeps), and the reader shows each line as a line,
 * with long lines wrapping under a hanging indent, and each stanza as a group for screen readers.
 * The words themselves are stored as before (the Markdown subset, CLAUDE.md rule 8); poem mode
 * only says how they are drawn.
 * What it adds:
 * - chapters.is_poem: true when the chapter is a poem. A new chapter of a story in the Poetry
 *   category starts in poem mode (trigger chapters_start_as_poem); the writer can switch it off.
 * - set_chapter_poem_mode(code, poem): the writer switches their own chapter on or off.
 * - get_chapter() answers 'is_poem', so the reader draws the poem's shape.
 * Who calls it: src/features/writing/ (the Poem mode switch in the chapter editor) and
 *   src/features/reading/ (ChapterText).
 * Tests: supabase/tests/database/350-poem-mode.test.sql.
 */

/* ---------- 1. The data ---------- */

alter table public.chapters add column is_poem boolean not null default false;
comment on column public.chapters.is_poem is
  'True when the chapter is a poem: the editor keeps every line and indent and the reader draws each line and stanza (MUST-2). Set by the writer through set_chapter_poem_mode(); a new chapter of a Poetry story starts true.';

/*
 * chapters_start_as_poem(): a new chapter of a story in the Poetry category starts in poem mode,
 * since that is what a poet nearly always wants; the writer can switch it off in the editor.
 * Inputs: the new chapter row. Returns it. Raises nothing.
 */
create function public.chapters_start_as_poem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: only when the story's category is Poetry (the fixed key 'poetry', S1-E3-01).
  if exists (select 1 from public.stories
             join public.categories on categories.id = stories.category_id
             where stories.id = new.story_id and categories.slug = 'poetry') then
    new.is_poem := true;
  end if;
  return new;
end;
$$;
comment on function public.chapters_start_as_poem() is
  'Trigger: a new chapter of a Poetry story starts in poem mode (MUST-2).';
revoke all on function public.chapters_start_as_poem() from public, anon, authenticated;

create trigger chapters_start_as_poem
  before insert on public.chapters
  for each row execute function public.chapters_start_as_poem();

/* ---------- 2. Switching it ---------- */

/*
 * set_chapter_poem_mode(chapter_code, poem): switches the caller's own chapter to poem mode or
 * back. Inputs: the chapter's 8-character code and true or false. Returns 'ok', or 'not_found'
 * when the caller has no live chapter with that code (someone else's included, so nothing is
 * given away). Raises insufficient_privilege when signed out. Called by the Poem mode switch in
 * the chapter editor.
 */
create function public.set_chapter_poem_mode(chapter_code text, poem boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  -- Step 1: a signed-in writer only.
  if caller_id is null then
    raise exception 'Sign in to change a chapter.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: only their own live chapter; the words aren't touched, only how they are drawn.
  update public.chapters set is_poem = coalesce(poem, false), updated_at = now()
  where chapters.code = chapter_code
    and chapters.user_id = caller_id
    and chapters.deleted_at is null;
  if not found then
    return 'not_found';
  end if;
  return 'ok';
end;
$$;
comment on function public.set_chapter_poem_mode(text, boolean) is
  'Switches the caller''s own chapter to poem mode or back (MUST-2).';
revoke all on function public.set_chapter_poem_mode(text, boolean) from public, anon;
grant execute on function public.set_chapter_poem_mode(text, boolean) to authenticated;

/* ---------- 3. The reader ---------- */

-- get_chapter(): unchanged except for 'is_poem'.
CREATE OR REPLACE FUNCTION public.get_chapter(story_slug text, chapter_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  chapter public.chapters;
  readable_codes text[];
  place integer;
  text_to_send text;
  teaser_words integer;
  app_only boolean;
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
  -- Step 4: the text. GAPS-15: none on the web while "In the app only" applies, except for the
  -- writer; otherwise all of it for a signed-in reader and the teaser for a signed-out visitor.
  app_only := public.story_app_only_applies(story.is_app_only)
    and story.user_id is distinct from caller_id;
  if app_only then
    text_to_send := '';
  elsif caller_id is not null then
    text_to_send := chapter.published_body;
  else
    select coalesce((settings.value #>> '{}')::integer, 600) into teaser_words
    from public.settings where settings.key = 'teaser_length';
    text_to_send := public.teaser_of(chapter.published_body, coalesce(teaser_words, 600));
  end if;
  -- Step 5: the answer, with the pictures and cards in the text that is sent.
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
    'needs_sign_in', caller_id is null and not app_only,
    'is_teaser', caller_id is null and not app_only,
    'app_only', app_only,
    -- MUST-2: a poem's lines and stanzas are drawn as written.
    'is_poem', chapter.is_poem,
    'text_continues', not app_only
      and public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send,
    'pictures', public.chapter_picture_states(text_to_send, story.user_id),
    'embeds', public.chapter_embed_states(text_to_send, story.user_id));
end;
$$;
