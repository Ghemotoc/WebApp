/*
 * App only stories, behind a switch that stays off until the apps exist (bundle GAPS-15;
 * stories S1-E3-08 and S1-E4-09; boards NewStory "Where can people read this story?", AppOnly,
 * and the "In the app only" cover label on Website-Home, Discover and Library).
 *
 * Decisions: writers choose per story where it can be read, on the web and in the app (the
 * default) or in the app only; on the web an app-only story shows its cover, blurb and chapter
 * list and a notice, never the chapter text (decisions, 16 Oct 2026, chat); the label shows on
 * the cover wherever stories appear on the website (Q4, 16 Oct 2026); app only is a separate
 * switch that combines with Public or Unlisted (NEW-1). March is web only and the apps come
 * after it, so until then signed-in readers read every chapter on the web and writers are told
 * (Q35, 16 Oct 2026, late evening).
 *
 * What this adds:
 * - stories.is_app_only: the writer's choice, false by default;
 * - the 'app_only_stories' flag, off: while it is off the choice is saved but nothing changes
 *   for readers, so no story becomes unreadable before the apps exist;
 * - story_app_only_applies(): the one place that says whether the choice applies now;
 * - set_my_story_app_only(): the writer saves the choice;
 * - get_chapter(): no chapter text for anyone but the writer while the choice applies, with
 *   'app_only' true so the reader shows the notice (S1-E4-09);
 * - get_shared_passage(): no shared passage (and so no shared picture) from such a story;
 * - get_story_page() and story_card_json(): 'app_only' for the notice and the cover label.
 * Called by: the story settings and New story screens, the reader, the story page and every
 * story card through these functions.
 */

/* ---------- The column and the switch ---------- */

alter table public.stories add column is_app_only boolean not null default false;

comment on column public.stories.is_app_only is
  'The writer chose "In the app only" (S1-E3-08). Applies only while the app_only_stories flag is on (GAPS-15).';

insert into public.feature_flags (key, is_enabled, is_public, description)
values ('app_only_stories', false, true,
  'While on, a story the writer set to "In the app only" shows no chapter text on the web. Stays off until the apps exist (S1-E3-08, Q35; GAPS-15).')
on conflict (key) do nothing;

/* ---------- Whether the choice applies ---------- */

/**
 * Says whether a story's "In the app only" choice applies right now.
 * Inputs: the story's is_app_only value. Returns true only when the writer chose it and the
 * 'app_only_stories' flag is on (Q35: off until the apps exist). Raises nothing.
 * Called by get_chapter(), get_shared_passage(), get_story_page() and story_card_json().
 */
create function public.story_app_only_applies(chosen boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(chosen, false) and public.is_feature_enabled('app_only_stories');
$$;

comment on function public.story_app_only_applies(boolean) is
  'True when a story is set to app only and the app_only_stories flag is on (GAPS-15).';

revoke all on function public.story_app_only_applies(boolean) from public;
grant execute on function public.story_app_only_applies(boolean) to anon, authenticated;

/* ---------- The writer saves the choice ---------- */

/**
 * The writer sets where their story can be read: on the web and in the app (false) or in the
 * app only (true). Saved even while the flag is off, so it applies the day the apps arrive.
 * Inputs: the story's slug and the wanted value. Returns {outcome: ok | not_active |
 * not_found}. Raises insufficient_privilege when nobody is signed in.
 * Called by the story settings and New story screens after the other settings have saved.
 */
create function public.set_my_story_app_only(story_slug text, wanted boolean)
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
  -- Step 2: save it. Library entries and follows stay as they are (S1-E3-08).
  update public.stories set is_app_only = coalesce(wanted, false) where stories.id = target_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_my_story_app_only(text, boolean) is
  'The writer sets whether their story is read in the app only (S1-E3-08; GAPS-15).';

revoke all on function public.set_my_story_app_only(text, boolean) from public;
grant execute on function public.set_my_story_app_only(text, boolean) to authenticated;

/* ---------- The reader: no chapter text while app only applies ---------- */

/**
 * One chapter for the reader (S1-E4-01), as before, plus GAPS-15: while the story's "In the
 * app only" choice applies, nobody but the writer gets the text; the answer says 'app_only'
 * so the reader shows the notice instead (S1-E4-09).
 * Inputs: the story's slug and the chapter's code. Returns the chapter JSON or null when the
 * caller may not read it. Raises nothing.
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
    'text_continues', not app_only
      and public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send,
    'pictures', public.chapter_picture_states(text_to_send, story.user_id),
    'embeds', public.chapter_embed_states(text_to_send, story.user_id));
end;
$$;

/* ---------- Shared passages: none from an app-only story ---------- */

/**
 * The passage a shared link points to (S1-E4-11), as before, plus GAPS-15: nothing while the
 * story's "In the app only" choice applies, so no chapter text reaches a link preview.
 * get_shared_picture() goes through this function, so it is covered too.
 * Inputs: story slug, chapter code, first and last block. Returns {blocks} or null.
 */
create or replace function public.get_shared_passage(
  story_slug text, chapter_code text, first_block integer, last_block integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  chapter public.chapters;
  shared_blocks jsonb;
begin
  -- Step 1: a chapter a visitor may see a preview of, from a story that shares content.
  if first_block < 1 or last_block < first_block or last_block - first_block > 4
     or public.get_link_preview(story_slug, chapter_code) is null then
    return null;
  end if;
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  select * into chapter from public.chapters where chapters.story_id = story.id and chapters.code = chapter_code;
  if not public.story_shares_content(story.rating) then
    return null;
  end if;
  -- GAPS-15 (S1-E3-08): no chapter text in a link preview while "In the app only" applies.
  if public.story_app_only_applies(story.is_app_only) then
    return null;
  end if;
  -- Step 2: each block in the range: a lone picture as its alt text, anything else as text.
  select jsonb_agg(block.shared order by block.block_number) into shared_blocks
  from (
    select blocks.block_number, public.shared_block(blocks.block_text, story, chapter.id) as shared
    from public.chapter_blocks(chapter.published_body) as blocks
    where blocks.block_number between first_block and last_block
  ) as block
  where block.shared is not null;
  if shared_blocks is null then
    return null;
  end if;
  return jsonb_build_object('blocks', shared_blocks);
end;
$$;

/* ---------- The story page: the notice ---------- */

/**
 * The public story page (S1-E3-05), as before, plus GAPS-15: 'app_only' says the story's
 * "In the app only" choice applies, so the page shows the notice beside the chapter list.
 * Inputs: the story's slug. Returns the page JSON or null when the caller may not see it.
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
  -- S1-E11-08: a hidden title or cover is masked for readers.
  story := public.story_as_shown(story);

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
      -- CMS-1e: readers see only approved tags; a waiting one shows only in the writer's settings.
      where story_tags.story_id = story.id and tags.status = 'approved'), '[]'::jsonb),
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
        'handle', profiles.handle, 'bio', public.bio_for_caller(profiles),
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    'chapters', public.story_page_chapters(story.id, is_owner),
    'is_owner', is_owner,
    -- GAPS-15: the "In the app only" notice (S1-E3-08), only once the apps exist.
    'app_only', public.story_app_only_applies(story.is_app_only),
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;

/* ---------- Story cards: the cover label ---------- */

/**
 * One story card (S1-E5-01), as before, plus GAPS-15: 'app_only' for the "In the app only"
 * label on the cover (Q4, 16 Oct 2026), only while the choice applies.
 * Inputs: the story's ID. Returns the card JSON, or null when there is no such story.
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
    'last_chapter_published_at', stories.last_chapter_published_at,
    -- GAPS-15: the "In the app only" cover label, only once the apps exist.
    'app_only', public.story_app_only_applies(stories.is_app_only))
  -- S1-E11-08: the story as the caller may see it (a hidden title or cover masked). In FROM, so
  -- story_as_shown() runs once, not once per column ("(story_as_shown(raw)).*", QA-2a).
  from public.stories as raw
  cross join lateral public.story_as_shown(raw) as stories
  join public.profiles on profiles.id = stories.user_id
  join public.categories on categories.id = stories.category_id
  where raw.id = target_story_id;
$$;
