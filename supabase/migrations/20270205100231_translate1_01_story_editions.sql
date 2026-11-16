/*
 * One story in several languages: the database rules (bundle TRANSLATE-1, part 1a; Robert,
 * 16 Nov 2026, 11:23 to 12:23 UTC; design handoff "Design: translations handoff", canvas v133).
 *
 * The model: one story, several editions. Every language of a story is an "edition", and each
 * edition is an ordinary row in `stories` with its own title, description, address and chapters.
 * The first edition a story had is its "first edition"; every later one points at it through
 * stories.edition_of_story_id. A chapter of a later edition points at the chapter it translates
 * through chapters.translation_of_chapter_id, which is how "Read in" keeps the reader's chapter.
 *
 * Robert's decisions built in here:
 * - Only the writer translates their own story (16 Nov, 12:20): an edition always has the same
 *   owner as its first edition, checked by a trigger, and add_story_language() is the only way in.
 * - Likes add up across languages to one total per story (16 Nov, 12:20): story_like_total() and
 *   the ranking score count the whole story, whichever edition was read.
 * - The language switch and language tags show only when a story has more than one language
 *   (16 Nov, 12:23): story_editions_json() and the card's `languages` are empty unless at least
 *   two editions can be read.
 * - A story opens in the page's language, then in a language the reader reads, then in its first
 *   edition (handoff, "Opening language"): best_edition_id() picks, and listed_stories() shows a
 *   story once, in that edition.
 *
 * What it builds:
 * - stories.edition_of_story_id and chapters.translation_of_chapter_id, with their rules.
 * - The settings every edition shares (rating, labels, category, cover, who can read) are copied
 *   from the first edition and follow it when it changes, so no edition can be rated lower or
 *   stay public after the first edition was made private. Tags follow too.
 * - A translated chapter can be read only while the chapter it translates can be read.
 * - For the writer: add_story_language(), story_languages(), story_translation_chapters(),
 *   start_chapter_translation(), chapter_translation_source().
 * - For readers: get_story_page(), get_chapter() and story_card_json() learn about editions, and
 *   get_chapter() answers "this chapter isn't translated yet" for a chapter of the first edition
 *   asked for under a later edition's address.
 *
 * No new table: an edition is a story and a translated chapter is a chapter, so every existing
 * rule (RLS, ratings, blocks, reports, moderation, export, deletion, the archive) covers them.
 *
 * Who calls it: src/features/reading/ and src/features/discovery/ (part 1b), src/features/writing/
 * (part 1c), src/features/staff/ (part 1d, classics).
 * Tests: supabase/tests/database/382-story-editions.test.sql and 383-story-editions-reading.test.sql.
 */

/* ---------- 1. Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('story_languages_max', '10'::jsonb, true,
   'The most languages one story can have, the first edition included (TRANSLATE-1a; builder proposal).')
on conflict (key) do nothing;

/* ---------- 2. The two links ---------- */

alter table public.stories
  add column edition_of_story_id uuid references public.stories (id) on delete cascade,
  add constraint stories_edition_not_of_itself check (edition_of_story_id is null or edition_of_story_id <> id);

comment on column public.stories.edition_of_story_id is
  'For a later language edition of a story: the first edition it belongs to. Null for a story in one language and for every first edition (TRANSLATE-1a).';

-- Finds a story's editions (every reader path asks "does this story have other languages?").
create index stories_edition_of_story_id_idx on public.stories (edition_of_story_id)
  where edition_of_story_id is not null;

-- One live edition per language of a story.
create unique index stories_one_edition_per_language on public.stories (edition_of_story_id, language_code)
  where edition_of_story_id is not null and deleted_at is null;

alter table public.chapters
  add column translation_of_chapter_id uuid references public.chapters (id) on delete cascade,
  add constraint chapters_translation_not_of_itself
    check (translation_of_chapter_id is null or translation_of_chapter_id <> id);

comment on column public.chapters.translation_of_chapter_id is
  'For a chapter of a later language edition: the first edition''s chapter it translates. Null for every other chapter (TRANSLATE-1a).';

create index chapters_translation_of_chapter_id_idx on public.chapters (translation_of_chapter_id)
  where translation_of_chapter_id is not null;

-- One live translation of a chapter per edition.
create unique index chapters_one_translation_per_edition on public.chapters (story_id, translation_of_chapter_id)
  where translation_of_chapter_id is not null and deleted_at is null;

/* ---------- 3. The rules of an edition ---------- */

/**
 * Trigger: keeps a language edition honest, before it is saved.
 * What it does: for a row with edition_of_story_id it checks the link (a live first edition that
 * isn't itself an edition, the same owner, another language, never re-pointed) and then copies
 * the settings every edition shares from the first edition, whatever the caller sent. For a first
 * edition it refuses a language one of its editions already uses.
 * Inputs: the row. Returns: the row to save.
 * Errors: check_violation with a hint (edition_chain, edition_owner, edition_language,
 * edition_fixed) when a rule is broken.
 * Where it fits: every insert and update of public.stories; add_story_language() relies on it.
 */
create or replace function public.stories_edition_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_edition public.stories;
begin
  -- Step 1: a story that isn't a later edition only has to keep its language apart from its editions.
  if new.edition_of_story_id is null then
    if tg_op = 'UPDATE' and old.edition_of_story_id is not null then
      raise exception 'An edition stays an edition of the same story.'
        using errcode = 'check_violation', hint = 'edition_fixed';
    end if;
    if tg_op = 'UPDATE' and new.language_code is distinct from old.language_code and exists (
        select 1 from public.stories as editions
        where editions.edition_of_story_id = new.id and editions.deleted_at is null
          and editions.language_code = new.language_code) then
      raise exception 'The story already has an edition in that language.'
        using errcode = 'check_violation', hint = 'edition_language';
    end if;
    return new;
  end if;

  -- Step 2: the link never changes once the edition exists.
  if tg_op = 'UPDATE' and new.edition_of_story_id is distinct from old.edition_of_story_id then
    raise exception 'An edition stays an edition of the same story.'
      using errcode = 'check_violation', hint = 'edition_fixed';
  end if;

  -- Step 3: the first edition: it exists, it isn't an edition itself and nothing points at this row.
  select * into first_edition from public.stories where stories.id = new.edition_of_story_id;
  if first_edition.id is null or first_edition.edition_of_story_id is not null
      or exists (select 1 from public.stories as editions where editions.edition_of_story_id = new.id) then
    raise exception 'An edition belongs to a story that isn''t an edition itself.'
      using errcode = 'check_violation', hint = 'edition_chain';
  end if;

  -- Step 4: only the writer translates their own story (Robert, 16 Nov 2026, 12:20 UTC).
  if new.user_id <> first_edition.user_id then
    raise exception 'Only the story''s writer can add a language to it.'
      using errcode = 'check_violation', hint = 'edition_owner';
  end if;

  -- Step 5: another language than the first edition (other editions: the unique index).
  if new.language_code = first_edition.language_code then
    raise exception 'The story is already in that language.'
      using errcode = 'check_violation', hint = 'edition_language';
  end if;

  -- Step 6: a live edition needs a live first edition (deleting the story takes its editions too).
  if new.deleted_at is null and first_edition.deleted_at is not null then
    raise exception 'Restore the story before its other languages.'
      using errcode = 'check_violation', hint = 'edition_story_deleted';
  end if;

  -- Step 7: the shared settings, always the first edition's. Who can read a story (CLAUDE.md
  -- rule 18: the rating; NEW-1: the visibility; S1-E8-11: class only) must be the same in every
  -- language, or a translation could show what the original hides.
  new.category_id := first_edition.category_id;
  new.rating := first_edition.rating;
  new.rating_reasons := first_edition.rating_reasons;
  new.is_fan_fiction := first_edition.is_fan_fiction;
  new.is_parody := first_edition.is_parody;
  new.deals_with_abuse_or_coercion := first_edition.deals_with_abuse_or_coercion;
  new.ai_disclosure := first_edition.ai_disclosure;
  new.ai_undisclosed_labelled_at := first_edition.ai_undisclosed_labelled_at;
  new.classic_author_id := first_edition.classic_author_id;
  new.first_published_year := first_edition.first_published_year;
  new.visibility := first_edition.visibility;
  new.class_only := first_edition.class_only;
  new.class_space_id := first_edition.class_space_id;
  new.is_app_only := first_edition.is_app_only;
  new.comments_enabled := first_edition.comments_enabled;
  new.comment_audience := first_edition.comment_audience;
  new.quote_cards_enabled := first_edition.quote_cards_enabled;
  new.picture_sharing_enabled := first_edition.picture_sharing_enabled;
  new.card_colour := first_edition.card_colour;
  new.cover_kind := first_edition.cover_kind;
  new.cover_design := first_edition.cover_design;
  new.cover_background := first_edition.cover_background;
  new.cover_accent := first_edition.cover_accent;
  new.cover_tall_path := first_edition.cover_tall_path;
  new.cover_square_path := first_edition.cover_square_path;
  new.cover_hidden_at := first_edition.cover_hidden_at;
  -- The content note is words, so each edition has its own; an empty one borrows the first
  -- edition's, because a story about abuse must carry a note (stories_abuse_needs_rating_and_note).
  if btrim(coalesce(new.content_note, '')) = '' then
    new.content_note := first_edition.content_note;
  end if;
  return new;
end;
$$;
comment on function public.stories_edition_rules() is
  'Trigger: checks a language edition''s link and copies the settings every edition shares from the first edition (TRANSLATE-1a).';
revoke execute on function public.stories_edition_rules() from public, anon, authenticated;

-- Named to run before the other "before" triggers on stories (they fire in name order), so the
-- rating and cover checks see the copied values.
create trigger stories_a_edition_rules before insert or update on public.stories
  for each row execute function public.stories_edition_rules();

/**
 * Trigger: a first edition's shared settings reach its other editions.
 * What it does: after a first edition changes, every one of its editions is updated with the same
 * shared settings. The columns are named in the update so the triggers that watch them (the
 * rating check, pictures back to review after a rating change) run for the editions too.
 * Inputs: the changed row. Returns: nothing (an after trigger). Errors: none of its own.
 * Where it fits: after every update of a story that isn't an edition; a story with one
 * language has no editions, so the update finds nothing through the index.
 */
create or replace function public.stories_editions_follow_first()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stories as editions set
    category_id = new.category_id,
    rating = new.rating,
    rating_reasons = new.rating_reasons,
    is_fan_fiction = new.is_fan_fiction,
    is_parody = new.is_parody,
    deals_with_abuse_or_coercion = new.deals_with_abuse_or_coercion,
    ai_disclosure = new.ai_disclosure,
    visibility = new.visibility,
    class_only = new.class_only,
    class_space_id = new.class_space_id,
    is_app_only = new.is_app_only,
    comments_enabled = new.comments_enabled,
    comment_audience = new.comment_audience,
    cover_kind = new.cover_kind,
    cover_design = new.cover_design,
    cover_background = new.cover_background,
    cover_accent = new.cover_accent,
    cover_tall_path = new.cover_tall_path,
    cover_square_path = new.cover_square_path
  where editions.edition_of_story_id = new.id
    -- Only when something shared really changed; stories_edition_rules() copies the rest.
    and (editions.category_id, editions.rating, editions.rating_reasons, editions.is_fan_fiction,
         editions.is_parody, editions.deals_with_abuse_or_coercion, editions.ai_disclosure,
         editions.ai_undisclosed_labelled_at, editions.classic_author_id, editions.first_published_year,
         editions.visibility, editions.class_only, editions.class_space_id, editions.is_app_only,
         editions.comments_enabled, editions.comment_audience, editions.quote_cards_enabled,
         editions.picture_sharing_enabled, editions.card_colour, editions.cover_kind,
         editions.cover_design, editions.cover_background, editions.cover_accent,
         editions.cover_tall_path, editions.cover_square_path, editions.cover_hidden_at)
      is distinct from
        (new.category_id, new.rating, new.rating_reasons, new.is_fan_fiction,
         new.is_parody, new.deals_with_abuse_or_coercion, new.ai_disclosure,
         new.ai_undisclosed_labelled_at, new.classic_author_id, new.first_published_year,
         new.visibility, new.class_only, new.class_space_id, new.is_app_only,
         new.comments_enabled, new.comment_audience, new.quote_cards_enabled,
         new.picture_sharing_enabled, new.card_colour, new.cover_kind,
         new.cover_design, new.cover_background, new.cover_accent,
         new.cover_tall_path, new.cover_square_path, new.cover_hidden_at);
  return null;
end;
$$;
comment on function public.stories_editions_follow_first() is
  'Trigger: after a first edition changes, its other language editions take the same shared settings (TRANSLATE-1a).';
revoke execute on function public.stories_editions_follow_first() from public, anon, authenticated;

create trigger stories_editions_follow_first after update on public.stories
  for each row when (new.edition_of_story_id is null)
  execute function public.stories_editions_follow_first();

/**
 * Trigger: a first edition's tags are every edition's tags.
 * What it does: a tag added to a first edition is added to its editions; a tag taken off is
 * taken off them. Tags have names in every language (tag_names), so one set serves all editions.
 * Inputs: the story_tags row. Returns: nothing (an after trigger). Errors: none.
 * Where it fits: set_story_tags() rewrites a story's tags; this keeps the editions in step.
 */
create or replace function public.story_tags_reach_editions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.story_tags (story_id, tag_id, user_id)
    select editions.id, new.tag_id, new.user_id
    from public.stories as editions
    where editions.edition_of_story_id = new.story_id
    on conflict do nothing;
  else
    delete from public.story_tags
    where story_tags.tag_id = old.tag_id
      and story_tags.story_id in (
        select editions.id from public.stories as editions where editions.edition_of_story_id = old.story_id);
  end if;
  return null;
end;
$$;
comment on function public.story_tags_reach_editions() is
  'Trigger: tags added to or taken off a first edition are added to or taken off its other language editions (TRANSLATE-1a).';
revoke execute on function public.story_tags_reach_editions() from public, anon, authenticated;

create trigger story_tags_reach_editions after insert or delete on public.story_tags
  for each row execute function public.story_tags_reach_editions();

/**
 * Trigger: the rules of a translated chapter.
 * What it does: in a later edition every chapter translates one chapter of the first edition
 * (there are no chapters of its own, so "Read in" can always keep the chapter); in any other
 * story no chapter is a translation. The link never changes.
 * Inputs: the row. Returns: the row to save.
 * Errors: check_violation with a hint (translation_needed, translation_wrong_story,
 * translation_fixed).
 * Where it fits: every insert and update of public.chapters; start_chapter_translation() relies on it.
 */
create or replace function public.chapters_translation_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_edition_id uuid;
  translated_story_id uuid;
begin
  if tg_op = 'UPDATE' and new.translation_of_chapter_id is distinct from old.translation_of_chapter_id then
    raise exception 'A translated chapter stays the translation of the same chapter.'
      using errcode = 'check_violation', hint = 'translation_fixed';
  end if;
  -- Nothing to check again when neither the story nor the link is being set.
  if tg_op = 'UPDATE' then
    return new;
  end if;
  select stories.edition_of_story_id into first_edition_id from public.stories where stories.id = new.story_id;
  if first_edition_id is null then
    if new.translation_of_chapter_id is not null then
      raise exception 'Only a chapter of another language edition can be a translation.'
        using errcode = 'check_violation', hint = 'translation_wrong_story';
    end if;
    return new;
  end if;
  if new.translation_of_chapter_id is null then
    raise exception 'A chapter in another language translates a chapter of the story.'
      using errcode = 'check_violation', hint = 'translation_needed';
  end if;
  select chapters.story_id into translated_story_id from public.chapters
  where chapters.id = new.translation_of_chapter_id and chapters.deleted_at is null;
  if translated_story_id is distinct from first_edition_id then
    raise exception 'That chapter belongs to another story.'
      using errcode = 'check_violation', hint = 'translation_wrong_story';
  end if;
  return new;
end;
$$;
comment on function public.chapters_translation_rules() is
  'Trigger: in a later language edition every chapter translates one chapter of the first edition, and the link never changes (TRANSLATE-1a).';
revoke execute on function public.chapters_translation_rules() from public, anon, authenticated;

create trigger chapters_translation_rules before insert or update of translation_of_chapter_id, story_id
  on public.chapters for each row execute function public.chapters_translation_rules();


/* ---------- 4. Which edition a reader gets ---------- */

/**
 * The language of the page the reader is on, as a two-letter code, or null.
 * What it does: reads the Accept-Language header of the request. The app sets it to the page's
 * language on every call (src/lib/supabase.ts); a call from elsewhere carries the browser's own
 * list, whose first language is used.
 * Inputs: none. Returns: 'ro', 'en', 'sv' and so on, or null outside a request.
 * Errors: none; a missing or odd header gives null.
 * Where it fits: best_edition_id(), the first step of "a story opens in the page language".
 * Privacy: the header is read for this one choice and never stored or logged (CLAUDE.md rule 12).
 */
create or replace function public.page_language()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(substring(
    coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'accept-language', '')
    from '^\s*([A-Za-z]{2})(?:[-_,;\s]|$)'));
$$;
comment on function public.page_language() is
  'Internal: the two-letter language of the page the reader is on, from the request''s Accept-Language header; never stored (TRANSLATE-1a).';
revoke execute on function public.page_language() from public, anon, authenticated;

/**
 * Whether readers can open an edition at all: live, not taken away by moderators, and with at
 * least one chapter that can be read.
 * Inputs: the edition's story row. Returns: true or false. Errors: none.
 * Where it fits: best_edition_id() and story_editions_json(). The rating and blocks are the same
 * for every edition of a story, so the caller's own check of them covers all editions.
 */
create or replace function public.edition_is_readable(edition public.stories)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select edition.deleted_at is null
    and not public.is_moderated_away('story', edition.id)
    and public.story_has_readable_chapter(edition.id);
$$;
comment on function public.edition_is_readable(public.stories) is
  'Internal: whether a language edition is live, not moderated away and has a chapter readers can open (TRANSLATE-1a).';
revoke execute on function public.edition_is_readable(public.stories) from public, anon, authenticated;

/**
 * The edition of a story this reader should get.
 * What it does: among the story's readable editions (only those in `wanted_languages` when a
 * language filter is on) it picks, in this order: the page's language, the first of the
 * languages the reader reads (profiles.reading_languages; by default the interface language,
 * then English), the first edition, then any.
 * Inputs: the first edition's ID; the language filter or null.
 * Returns: the chosen edition's story ID, or null when none can be read.
 * Errors: none.
 * Where it fits: listed_stories() shows a story once, in this edition (handoff, "Shelves and
 * search"); story_opening_edition() gives the story page the same answer.
 */
create or replace function public.best_edition_id(first_edition_id uuid, wanted_languages text[])
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with reader as (
    select coalesce(profiles.reading_languages, array[profiles.locale, 'en']) as languages
    from public.profiles where profiles.id = (select auth.uid())
  )
  select editions.id
  from public.stories as editions
  where (editions.id = first_edition_id or editions.edition_of_story_id = first_edition_id)
    and public.edition_is_readable(editions)
    and (wanted_languages is null or editions.language_code = any (wanted_languages))
  order by
    (editions.language_code = public.page_language()) desc nulls last,
    array_position((select reader.languages from reader), editions.language_code) asc nulls last,
    (editions.edition_of_story_id is null) desc,
    editions.created_at
  limit 1;
$$;
comment on function public.best_edition_id(uuid, text[]) is
  'Internal: the language edition of a story a reader gets: the page''s language, then a language they read, then the first edition (TRANSLATE-1a).';
revoke execute on function public.best_edition_id(uuid, text[]) from public, anon, authenticated;

/**
 * Whether an edition is in the language the work was first written in.
 * What it does: for a classic the answer comes from its record (classic_works.original_language:
 * a Romanian edition of an English novel is not the original even when it was added first); for
 * a member's story the first edition is the original.
 * Inputs: the edition's story row. Returns: true or false. Errors: none.
 * Where it fits: the "original" mark in the Read in menu and on cards.
 */
create or replace function public.edition_is_original(edition public.stories)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select works.original_language = left(edition.language_code, 2)
     from public.classic_works as works where works.story_id = edition.id),
    edition.edition_of_story_id is null);
$$;
comment on function public.edition_is_original(public.stories) is
  'Internal: whether a language edition is in the language the work was first written in (TRANSLATE-1a).';
revoke execute on function public.edition_is_original(public.stories) from public, anon, authenticated;

/**
 * The address of a chapter in one edition.
 * What it does: given a chapter of the first edition, returns the code of the readable chapter
 * that translates it in `edition_id`; when there is none (or the edition is the first edition)
 * it returns the first edition's own code, which the reader page understands as "not translated
 * yet" under a later edition's address.
 * Inputs: the edition's ID; the first edition's ID; the first edition's chapter ID.
 * Returns: an eight-character chapter code. Errors: none.
 * Where it fits: get_chapter() (previous, next and the Read in menu) and the edition's chapter list.
 */
create or replace function public.edition_chapter_code(edition_id uuid, first_edition_id uuid, source_chapter_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select translations.code from public.chapters as translations
     where edition_id <> first_edition_id
       and translations.story_id = edition_id
       and translations.translation_of_chapter_id = source_chapter_id
       and public.chapter_is_readable(translations.id)),
    (select sources.code from public.chapters as sources where sources.id = source_chapter_id));
$$;
comment on function public.edition_chapter_code(uuid, uuid, uuid) is
  'Internal: the code a language edition uses for a chapter of the first edition: its readable translation, else the first edition''s own code (TRANSLATE-1a).';
revoke execute on function public.edition_chapter_code(uuid, uuid, uuid) from public, anon, authenticated;

/**
 * The languages a story can be read in, for the Read in switch.
 * What it does: lists the story's readable editions (and always the one being shown), the first
 * edition first. Robert's rule (16 Nov 2026, 12:23 UTC): the switch and language tags show only
 * when a story has more than one language, so with fewer than two the answer is an empty list.
 * Inputs: the story being shown; optionally the first edition's chapter being read, which adds
 * each edition's address for that same chapter ("You stay on chapter n").
 * Returns: [{language_code, slug, title, is_original, translator_name, is_current,
 * chapter_code?}], or [].
 * Errors: none.
 * Where it fits: get_story_page(), get_chapter() and story_card_json().
 */
create or replace function public.story_editions_json(story public.stories, source_chapter_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with editions as (
    select raw.id, raw.slug, raw.language_code, raw.edition_of_story_id, raw.created_at,
      shown.title, public.edition_is_original(raw) as is_original,
      -- A classic's translator, for "Translated by" in the menu; a member's story has none.
      (select works.translator_name from public.classic_works as works
       where works.story_id = raw.id) as translator_name
    from public.stories as raw
    -- S1-E11-08: a title moderators hid stays hidden here too.
    cross join lateral public.story_as_shown(raw) as shown
    where (raw.id = coalesce(story.edition_of_story_id, story.id)
           or raw.edition_of_story_id = coalesce(story.edition_of_story_id, story.id))
      and (raw.id = story.id or public.edition_is_readable(raw))
  )
  select case when count(*) < 2 then '[]'::jsonb else jsonb_agg(
      jsonb_build_object(
        'language_code', editions.language_code,
        'slug', editions.slug,
        'title', editions.title,
        'is_original', editions.is_original,
        'translator_name', editions.translator_name,
        'is_current', editions.id = story.id)
      || case when source_chapter_id is null then '{}'::jsonb else jsonb_build_object(
        'chapter_code', public.edition_chapter_code(
          editions.id, coalesce(story.edition_of_story_id, story.id), source_chapter_id)) end
      order by (editions.edition_of_story_id is null) desc, editions.created_at) end
  from editions;
$$;
comment on function public.story_editions_json(public.stories, uuid) is
  'Internal: the languages a story can be read in, for the Read in switch; empty unless there are at least two (TRANSLATE-1a; Robert, 16 Nov 2026).';
revoke execute on function public.story_editions_json(public.stories, uuid) from public, anon, authenticated;

/**
 * What the story page says about the edition being shown ("About this edition").
 * What it does: gathers the language the work was first written in, whether this edition is that
 * original, how many of the story's chapters this edition has, the first edition's address and,
 * for a classic, the translator's name.
 * Inputs: the story being shown.
 * Returns: {original_language, is_original, is_first_edition, first_edition_slug,
 * first_edition_language, chapters_here, chapters_in_story, translator_name}. Errors: none.
 * Where it fits: get_story_page(). A member's story never has a translator credit, because only
 * the writer translates it (Robert, 16 Nov 2026, 12:20 UTC).
 */
create or replace function public.story_edition_json(story public.stories)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'original_language', coalesce(works.original_language, first_edition.language_code),
    'is_original', public.edition_is_original(story),
    'is_first_edition', story.edition_of_story_id is null,
    'first_edition_slug', first_edition.slug,
    'first_edition_language', first_edition.language_code,
    'chapters_in_story', (select count(*) from public.chapters
      where chapters.story_id = first_edition.id and public.chapter_is_readable(chapters.id)),
    'chapters_here', (select count(*) from public.chapters
      where chapters.story_id = story.id and public.chapter_is_readable(chapters.id)),
    'translator_name', works.translator_name)
  from public.stories as first_edition
  left join public.classic_works as works on works.story_id = story.id
  where first_edition.id = coalesce(story.edition_of_story_id, story.id);
$$;
comment on function public.story_edition_json(public.stories) is
  'Internal: the "About this edition" facts of a story page: original language, chapters in this language, the classic''s translator (TRANSLATE-1a).';
revoke execute on function public.story_edition_json(public.stories) from public, anon, authenticated;

/**
 * The chapter list of a later language edition, in the first edition's order.
 * What it does: one row per chapter of the first edition that readers can open. A chapter that
 * is translated shows the translation's title and code; one that isn't shows the first
 * edition's title and code with is_translated false ("Română only for now").
 * Inputs: the edition's ID; the first edition's ID.
 * Returns: [{code, number, title, status, published_at, edited_at, word_count, is_translated}].
 * Errors: none.
 * Where it fits: get_story_page() for an edition; a first edition keeps story_page_chapters().
 */
create or replace function public.edition_page_chapters(edition_id uuid, first_edition_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'code', coalesce(listed.translation_code, listed.source_code),
      'number', listed.number,
      'title', coalesce(listed.translation_title, listed.source_title),
      'status', 'published',
      'published_at', coalesce(listed.translation_published_at, listed.source_published_at),
      'edited_at', listed.edited_at,
      'word_count', coalesce(listed.translation_word_count, listed.source_word_count),
      'is_translated', listed.translation_code is not null
    ) order by listed.number), '[]'::jsonb)
  from (
    select sources.code as source_code,
      row_number() over (order by sources.position) as number,
      sources.published_title as source_title,
      sources.first_published_at as source_published_at,
      sources.published_word_count as source_word_count,
      translations.code as translation_code,
      translations.published_title as translation_title,
      translations.first_published_at as translation_published_at,
      translations.published_word_count as translation_word_count,
      translations.edited_at
    from public.chapters as sources
    left join public.chapters as translations
      on translations.story_id = edition_id
      and translations.translation_of_chapter_id = sources.id
      and public.chapter_is_readable(translations.id)
    where sources.story_id = first_edition_id
      and public.chapter_is_readable(sources.id)
  ) as listed;
$$;
comment on function public.edition_page_chapters(uuid, uuid) is
  'Internal: a later language edition''s chapter list in the first edition''s order, each marked translated or not (TRANSLATE-1a).';
revoke execute on function public.edition_page_chapters(uuid, uuid) from public, anon, authenticated;

/**
 * Where a story's address should open for this reader.
 * What it does: for a story with several languages it names the edition best_edition_id()
 * picks, so the story page can move a reader from /s/<first edition> to their language when
 * they haven't chosen one for this story themselves.
 * Inputs: a story's slug (any edition).
 * Returns: {slug, language_code} of the edition to show, or null when the story has one
 * language, can't be read by this caller or doesn't exist.
 * Errors: none.
 * Where it fits: src/features/reading/ (part 1b), before the story page is drawn.
 */
create or replace function public.story_opening_edition(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  chosen public.stories;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  -- Step 2: one language only, so nothing to choose.
  if story.edition_of_story_id is null and not exists (
      select 1 from public.stories as editions
      where editions.edition_of_story_id = story.id and editions.deleted_at is null) then
    return null;
  end if;
  -- Step 3: the edition for this reader.
  select * into chosen from public.stories
  where stories.id = public.best_edition_id(coalesce(story.edition_of_story_id, story.id), null);
  if chosen.id is null then
    return null;
  end if;
  return jsonb_build_object('slug', chosen.slug, 'language_code', chosen.language_code);
end;
$$;
comment on function public.story_opening_edition(text) is
  'The language edition a story should open in for this reader: the page''s language, then one they read, then the first edition; null for a story in one language (TRANSLATE-1a).';
revoke execute on function public.story_opening_edition(text) from public;
grant execute on function public.story_opening_edition(text) to anon, authenticated;


/* ---------- 5. For the writer ---------- */

/**
 * Adds a language to the caller's own story: a new edition with its own title and description.
 * What it does: checks the caller owns the story and may write, that the language is open and
 * new for this story, and that the story isn't at its limit; then creates the edition, which
 * takes the first edition's shared settings and tags. Called on an edition, it adds the
 * language to that edition's story.
 * Inputs: the story's slug; the new language code; the title and description in that language.
 * Returns: {outcome: 'ok', slug} with the new edition's address, or {outcome: 'not_active' |
 * 'not_found' | 'language_taken' | 'too_many'}.
 * Errors: insufficient_privilege when signed out; check_violation for a bad title, description
 * or a language that isn't open (check_story_basics()).
 * Where it fits: Story settings > Languages > "Add the language" (part 1c). Only the writer can
 * translate their story (Robert, 16 Nov 2026, 12:20 UTC), so there is no path for anyone else.
 */
create or replace function public.add_story_language(story_slug text, language_code text, title text, blurb text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_title text := regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g');
  clean_blurb text := btrim(coalesce(blurb, ''));
  first_edition public.stories;
  languages_max integer := coalesce((public.setting_value('story_languages_max') #>> '{}')::integer, 10);
  new_slug text;
begin
  -- Step 1: a signed-in writer who may write (the account gate), and their own live story.
  if caller_id is null then
    raise exception 'Sign in to add a language.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  select first_editions.* into first_edition
  from public.stories as asked
  join public.stories as first_editions on first_editions.id = coalesce(asked.edition_of_story_id, asked.id)
  where asked.id = public.my_live_story_id(story_slug) and first_editions.deleted_at is null
  for update of first_editions;
  if first_edition.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: the same rules as a new story's title, description and language (S1-E3-01).
  perform public.check_story_basics(clean_title, clean_blurb, language_code,
    (select categories.slug from public.categories where categories.id = first_edition.category_id));

  -- Step 3: a language the story doesn't have yet, and room for one more.
  if language_code = first_edition.language_code or exists (
      select 1 from public.stories as editions
      where editions.edition_of_story_id = first_edition.id and editions.deleted_at is null
        and editions.language_code = add_story_language.language_code) then
    return jsonb_build_object('outcome', 'language_taken');
  end if;
  if (select count(*) from public.stories as editions
      where editions.edition_of_story_id = first_edition.id and editions.deleted_at is null) + 1 >= languages_max then
    return jsonb_build_object('outcome', 'too_many');
  end if;

  -- Step 4: the edition, with a fresh address. stories_edition_rules() copies the shared
  -- settings; the ones a row can't be saved without are sent here as well.
  loop
    new_slug := public.story_slug_for(clean_title);
    exit when not exists (select 1 from public.stories where stories.slug = new_slug);
  end loop;
  insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating,
    ai_disclosure, edition_of_story_id)
  values (caller_id, new_slug, clean_title, clean_blurb, language_code, first_edition.category_id,
    first_edition.rating, first_edition.ai_disclosure, first_edition.id);

  -- Step 5: the first edition's tags (later changes follow through story_tags_reach_editions()).
  insert into public.story_tags (story_id, tag_id, user_id)
  select editions.id, story_tags.tag_id, caller_id
  from public.stories as editions
  join public.story_tags on story_tags.story_id = first_edition.id
  where editions.slug = new_slug
  on conflict do nothing;

  return jsonb_build_object('outcome', 'ok', 'slug', new_slug);
end;
$$;
comment on function public.add_story_language(text, text, text, text) is
  'A writer adds a language to their own story: a new edition with its own title and description; only the writer can (TRANSLATE-1a; Robert, 16 Nov 2026).';
revoke execute on function public.add_story_language(text, text, text, text) from public, anon;
grant execute on function public.add_story_language(text, text, text, text) to authenticated;

/**
 * Changes the title and description of one language of the caller's own story.
 * What it does: checks the caller owns the story and may write, checks the new title and
 * description with the rules of a new story, and saves them on that edition only. The address
 * stays the same, so links keep working. Everything else an edition has is shared with the
 * first edition and changed in Story settings.
 * Inputs: the edition's slug; the new title and description.
 * Returns: {outcome: 'ok' | 'not_active' | 'not_found'}.
 * Errors: insufficient_privilege when signed out; check_violation for a bad title or
 * description (check_story_basics()).
 * Where it fits: Story settings > Languages > a language > "Title and description" (part 1c).
 */
create or replace function public.update_story_language(story_slug text, title text, blurb text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_title text := regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g');
  clean_blurb text := btrim(coalesce(blurb, ''));
  edition public.stories;
begin
  -- Step 1: a signed-in writer who may write (the account gate), and their own live story.
  if caller_id is null then
    raise exception 'Sign in to change a language.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  select stories.* into edition from public.stories
  where stories.id = public.my_live_story_id(story_slug)
  for update;
  if edition.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: the same rules as a new story's title and description (S1-E3-01).
  perform public.check_story_basics(clean_title, clean_blurb, edition.language_code,
    (select categories.slug from public.categories where categories.id = edition.category_id));

  -- Step 3: only the words of this language change.
  update public.stories set title = clean_title, blurb = clean_blurb where stories.id = edition.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.update_story_language(text, text, text) is
  'A writer changes the title and description of one language of their own story (TRANSLATE-1c).';
revoke execute on function public.update_story_language(text, text, text) from public, anon;
grant execute on function public.update_story_language(text, text, text) to authenticated;

/**
 * The languages of the caller's own story, for Story settings > Languages.
 * What it does: lists the first edition and every other live edition with how far each one is:
 * how many of the story's chapters it has published and how many are drafts.
 * Inputs: the story's slug (any edition).
 * Returns: {first_edition_slug, languages_max, editions: [{slug, language_code, title, blurb,
 * is_first_edition, chapters_in_story, chapters_published, chapters_in_draft, is_public}]},
 * or null when the story isn't the caller's.
 * Errors: none.
 * Where it fits: src/features/writing/ (part 1c).
 */
create or replace function public.story_languages(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with first_edition as (
    select first_editions.* from public.stories as asked
    join public.stories as first_editions on first_editions.id = coalesce(asked.edition_of_story_id, asked.id)
    where asked.id = public.my_live_story_id(story_slug) and first_editions.deleted_at is null
  ),
  story_chapters as (
    select count(*) as total from public.chapters, first_edition
    where chapters.story_id = first_edition.id and chapters.deleted_at is null
  )
  select jsonb_build_object(
    'first_edition_slug', first_edition.slug,
    'languages_max', coalesce((public.setting_value('story_languages_max') #>> '{}')::integer, 10),
    'editions', (
      select jsonb_agg(jsonb_build_object(
          'slug', editions.slug,
          'language_code', editions.language_code,
          'title', editions.title,
          'blurb', editions.blurb,
          'is_first_edition', editions.edition_of_story_id is null,
          'chapters_in_story', (select story_chapters.total from story_chapters),
          'chapters_published', (select count(*) from public.chapters
            where chapters.story_id = editions.id and chapters.deleted_at is null and chapters.status = 'published'),
          'chapters_in_draft', (select count(*) from public.chapters
            where chapters.story_id = editions.id and chapters.deleted_at is null and chapters.status <> 'published'),
          'is_public', public.story_has_readable_chapter(editions.id))
        order by (editions.edition_of_story_id is null) desc, editions.created_at)
      from public.stories as editions
      where (editions.id = first_edition.id or editions.edition_of_story_id = first_edition.id)
        and editions.deleted_at is null))
  from first_edition;
$$;
comment on function public.story_languages(text) is
  'A writer''s own story: its language editions and how many chapters each has published or in draft (TRANSLATE-1a).';
revoke execute on function public.story_languages(text) from public, anon;
grant execute on function public.story_languages(text) to authenticated;

/**
 * The chapters of one of the caller's later editions, beside the chapters they translate.
 * What it does: one row per live chapter of the first edition, in its order, with the
 * translation's code, title and status when the writer has started one.
 * Inputs: the edition's slug.
 * Returns: [{number, original_code, original_title, original_status, code, title, status,
 * word_count, draft_saved_at}] (code, title and status are null where no translation exists),
 * or null when the story isn't the caller's or isn't a later edition.
 * Errors: none.
 * Where it fits: the edition's chapter list in src/features/writing/ (part 1c).
 */
create or replace function public.story_translation_chapters(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
      select jsonb_agg(jsonb_build_object(
          'number', listed.number,
          'original_code', listed.original_code,
          'original_title', listed.original_title,
          'original_status', listed.original_status,
          'code', listed.code,
          'title', listed.title,
          'status', listed.status,
          'word_count', listed.word_count,
          'draft_saved_at', listed.draft_saved_at) order by listed.number)
      from (
        select row_number() over (order by sources.position) as number,
          sources.code as original_code,
          coalesce(nullif(sources.draft_title, ''), sources.published_title) as original_title,
          sources.status as original_status,
          translations.code, translations.draft_title as title, translations.status,
          translations.word_count, translations.draft_saved_at
        from public.chapters as sources
        left join public.chapters as translations
          on translations.story_id = editions.id
          and translations.translation_of_chapter_id = sources.id
          and translations.deleted_at is null
        where sources.story_id = editions.edition_of_story_id and sources.deleted_at is null
      ) as listed), '[]'::jsonb)
  from public.stories as editions
  where editions.id = public.my_live_story_id(story_slug) and editions.edition_of_story_id is not null;
$$;
comment on function public.story_translation_chapters(text) is
  'A writer''s own later language edition: every chapter of the story with its translation''s code, title and status, if started (TRANSLATE-1a).';
revoke execute on function public.story_translation_chapters(text) from public, anon;
grant execute on function public.story_translation_chapters(text) to authenticated;

/**
 * Starts (or finds) the translation of one chapter in one of the caller's later editions.
 * What it does: creates an empty draft chapter in the edition that translates the given chapter
 * of the first edition, in the same place and as a poem if the original is one; when a live
 * translation already exists it returns that one.
 * Inputs: the edition's slug; the code of the first edition's chapter.
 * Returns: {outcome: 'ok', code} or {outcome: 'not_active' | 'not_found'}.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Translate" beside a chapter in the edition's chapter list (part 1c).
 */
create or replace function public.start_chapter_translation(story_slug text, original_chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  edition public.stories;
  original public.chapters;
  translation_code text;
begin
  -- Step 1: a signed-in writer who may write, and their own later edition.
  if caller_id is null then
    raise exception 'Sign in to translate a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  select * into edition from public.stories
  where stories.id = public.my_live_story_id(story_slug) and stories.edition_of_story_id is not null
  for update;
  if edition.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the chapter to translate, a live chapter of the first edition.
  select * into original from public.chapters
  where chapters.code = original_chapter_code and chapters.story_id = edition.edition_of_story_id
    and chapters.deleted_at is null;
  if original.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 3: the translation that already exists, or a new empty draft.
  select chapters.code into translation_code from public.chapters
  where chapters.story_id = edition.id and chapters.translation_of_chapter_id = original.id
    and chapters.deleted_at is null;
  if translation_code is null then
    translation_code := public.chapter_code();
    insert into public.chapters (story_id, user_id, code, position, translation_of_chapter_id, is_poem)
    values (edition.id, caller_id, translation_code, original.position, original.id, original.is_poem);
  end if;
  return jsonb_build_object('outcome', 'ok', 'code', translation_code);
end;
$$;
comment on function public.start_chapter_translation(text, text) is
  'A writer starts (or finds) the translation of one chapter in their own later language edition (TRANSLATE-1a).';
revoke execute on function public.start_chapter_translation(text, text) from public, anon;
grant execute on function public.start_chapter_translation(text, text) to authenticated;

/**
 * The original beside a translation, for the translation editor.
 * What it does: for one of the caller's translated chapters it returns the chapter it
 * translates: its title and text as readers see them, or the draft when it isn't published.
 * Inputs: the translated chapter's code.
 * Returns: {language_code, original: {code, language_code, title, body, is_published, is_poem,
 * story_slug}}, or null when the chapter isn't the caller's or isn't a translation.
 * Errors: none.
 * Where it fits: the side-by-side translation editor (part 1c). Only the writer ever reads this,
 * and both chapters are their own.
 */
create or replace function public.chapter_translation_source(chapter_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'language_code', editions.language_code,
    'original', jsonb_build_object(
      'code', originals.code,
      'language_code', first_editions.language_code,
      'story_slug', first_editions.slug,
      'title', case when originals.status = 'published' then originals.published_title else originals.draft_title end,
      'body', case when originals.status = 'published' then originals.published_body else originals.draft_body end,
      'is_published', originals.status = 'published',
      'is_poem', originals.is_poem))
  from public.chapters as translations
  join public.chapters as originals on originals.id = translations.translation_of_chapter_id
  join public.stories as editions on editions.id = translations.story_id
  join public.stories as first_editions on first_editions.id = originals.story_id
  where translations.code = chapter_code
    and translations.user_id = (select auth.uid())
    and translations.deleted_at is null;
$$;
comment on function public.chapter_translation_source(text) is
  'A writer''s own translated chapter: the chapter it translates, title and text, for the side-by-side editor (TRANSLATE-1a).';
revoke execute on function public.chapter_translation_source(text) from public, anon;
grant execute on function public.chapter_translation_source(text) to authenticated;

/* ---------- 6. Reading: the existing functions learn about editions ---------- */

/**
 * Every edition of the story a story row belongs to: the first edition and the later ones.
 * Inputs: any edition's ID. Returns: the IDs, the given one included (one row for a story in one
 * language). Errors: none.
 * Where it fits: totals that count the whole story (likes, the ranking score) and deleting a story.
 */
create or replace function public.story_family_ids(target_story_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family.id
  from public.stories as target
  join public.stories as family
    on family.id = coalesce(target.edition_of_story_id, target.id)
    or family.edition_of_story_id = coalesce(target.edition_of_story_id, target.id)
  where target.id = target_story_id;
$$;
comment on function public.story_family_ids(uuid) is
  'Internal: the IDs of every language edition of the story a story row belongs to (TRANSLATE-1a).';
revoke execute on function public.story_family_ids(uuid) from public, anon, authenticated;

/**
 * Whether readers can open a chapter (S1-E3-03, redefined for TRANSLATE-1a).
 * What it does: true when the chapter is published, not deleted, not taken away by moderators,
 * its story is live and open to this caller (class only, private) and, new here, when a
 * translated chapter's original can itself be read. So unpublishing or removing a chapter of the
 * first edition closes its translations with it.
 * Inputs: the chapter's ID. Returns: true or false. Errors: none.
 * Where it fits: every reader path (get_chapter(), lists, likes, comments).
 */
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
      -- TRANSLATE-1a: a translated chapter can be read only while the chapter it translates can.
      and (chapters.translation_of_chapter_id is null
           or public.chapter_is_readable(chapters.translation_of_chapter_id))
  );
$$;

/**
 * Whether a story has at least one chapter readers can open (redefined for TRANSLATE-1a).
 * What it does: as before, plus the rule that a translated chapter counts only while the chapter
 * it translates can be read.
 * Inputs: the story's ID. Returns: true or false. Errors: none.
 * Where it fits: the story page, lists and the scores job.
 */
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
      -- TRANSLATE-1a: a translated chapter can be read only while the chapter it translates can.
      and (chapters.translation_of_chapter_id is null
           or public.chapter_is_readable(chapters.translation_of_chapter_id))
  );
$$;

/**
 * The stories of one list that this caller may see (S1-E5-01 and later, redefined for TRANSLATE-1a).
 * What changed: a story with several languages is listed once, in the edition best_edition_id()
 * picks for this reader (the page's language, a language they read, the first edition); a
 * translated chapter counts only while its original can be read; and a search that matches any
 * edition finds the story. Libraries and reading lists keep the exact edition someone saved.
 * Inputs: the list kind and key, and the category, completion and language filters.
 * Returns: the story rows, titles and covers as the caller may see them. Errors: none.
 * Where it fits: browse_stories(), shelves, search and every other list of stories.
 */
create or replace function public.listed_stories(list_kind text, list_key text, category_slug text, completion public.completion_status, language text)
returns SETOF public.stories
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
        -- TRANSLATE-1a: a translated chapter counts only while its original can be read.
        and (chapters.translation_of_chapter_id is null
             or public.chapter_is_readable(chapters.translation_of_chapter_id))
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
           -- TRANSLATE-1a: a restriction on the story holds for its other languages too.
           where story_restrictions.story_id in (stories.id, stories.edition_of_story_id)
             and story_restrictions.lifted_at is null))
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
    -- TRANSLATE-1a: a story in several languages is listed once, in this reader's edition
    -- (handoff, "Shelves and search"). A story in one language is answered by the first line,
    -- through the index, without the function.
    and (list_kind in ('library', 'reader_library', 'reading_list')
         or (stories.edition_of_story_id is null and not exists (
               select 1 from public.stories as editions
               where editions.edition_of_story_id = stories.id and editions.deleted_at is null))
         or stories.id = public.best_edition_id(
              coalesce(stories.edition_of_story_id, stories.id), wanted_languages))
    -- The list's own rule: the three open lists hold every story; search uses the indexes; the
    -- rest ask list_holds_story().
    and (
      list_kind in ('updated', 'new', 'popular')
      -- TRANSLATE-1a: a match in any edition finds the story, whichever edition is shown.
      or (is_search and stories.id in (
            select related.id
            from public.story_search_documents as documents
            join public.stories as matched on matched.id = documents.story_id
            join public.stories as related
              on related.id = matched.id
              or related.id = matched.edition_of_story_id
              or related.edition_of_story_id = coalesce(matched.edition_of_story_id, matched.id)
            where documents.document @@ search_terms or documents.search_text like search_pattern))
      or (list_kind not in ('updated', 'new', 'popular', 'search')
          and public.list_holds_story(stories, list_kind, list_key)));
end;
$_$;

/**
 * A story's likes, counted across every language it is in (S1-E6-03, redefined for TRANSLATE-1a).
 * What it does: counts the likes on readable chapters of every edition of the story, from
 * accounts that still exist. Robert, 16 Nov 2026, 12:20 UTC: likes add up across languages to
 * one total per story.
 * Inputs: any edition's ID. Returns: the total. Errors: none.
 * Where it fits: the story page's numbers and the writer's dashboard.
 */
create or replace function public.story_like_total(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.chapter_likes
  join public.chapters on chapters.id = chapter_likes.chapter_id
  join public.profiles on profiles.id = chapter_likes.user_id
  where chapters.story_id in (select public.story_family_ids(target_story_id))
    and public.chapter_is_readable(chapters.id)
    and profiles.deleted_at is null;
$$;

/**
 * One story card (S1-E5-01 and later, redefined for TRANSLATE-1a).
 * What changed: `languages` lists the languages the story can be read in, for the small language
 * tags on a card. Robert, 16 Nov 2026, 12:23 UTC: tags show only when a story has more than one
 * language, so a story in one language gets an empty list.
 * Inputs: the story's ID. Returns: the card as JSON, or no row for an unknown ID. Errors: none.
 * Where it fits: every shelf, list and search result.
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
    'app_only', public.story_app_only_applies(stories.is_app_only),
    -- TRANSLATE-1a: a story in one language is answered by the index alone.
    'languages', case
      when raw.edition_of_story_id is null and not exists (
        select 1 from public.stories as editions
        where editions.edition_of_story_id = raw.id and editions.deleted_at is null) then '[]'::jsonb
      else public.story_editions_json(raw) end)
  -- S1-E11-08: the story as the caller may see it (a hidden title or cover masked). In FROM, so
  -- story_as_shown() runs once, not once per column ("(story_as_shown(raw)).*", QA-2a).
  from public.stories as raw
  cross join lateral public.story_as_shown(raw) as stories
  join public.profiles on profiles.id = stories.user_id
  join public.categories on categories.id = stories.category_id
  where raw.id = target_story_id;
$$;

/**
 * The story page (S1-E3-05 and later, redefined for TRANSLATE-1a).
 * What changed: `editions` feeds the "Read in" switch (empty for a story in one language),
 * `edition` feeds "About this edition" and the "Translated by" line, and a later edition's
 * chapter list follows the first edition's order with each chapter marked translated or not.
 * Inputs: the story's slug (any edition). Returns: the page as JSON, or null when the story
 * doesn't exist or this caller may not see it. Errors: none.
 * Where it fits: src/features/reading/ story page.
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
    -- TRANSLATE-1a: a reader of a later edition sees every chapter of the story, in order.
    'chapters', case when story.edition_of_story_id is not null and not is_owner
      then public.edition_page_chapters(story.id, story.edition_of_story_id)
      else public.story_page_chapters(story.id, is_owner) end,
    'editions', public.story_editions_json(story),
    'edition', public.story_edition_json(story),
    'is_owner', is_owner,
    -- GAPS-15: the "In the app only" notice (S1-E3-08), only once the apps exist.
    'app_only', public.story_app_only_applies(story.is_app_only),
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;


/**
 * One chapter for the reader page (S1-E4-01 and later, redefined for TRANSLATE-1a).
 * What it does: finds the story and the chapter, works out the chapter's place in the story and
 * sends the text (all of it signed in, the teaser signed out, none while "In the app only").
 * New here: in a later language edition the place and the arrows follow the first edition's
 * chapters, `editions` gives the "Read in" switch each edition's address for this same chapter,
 * and a chapter of the first edition asked for under a later edition's address answers with the
 * translation when there is one, or with `missing_translation` when there isn't.
 * Inputs: the story's slug (any edition); the chapter's code.
 * Returns: the chapter as JSON; or {missing_translation: true, story, number, total, original,
 * translated_through, translator_name, previous_code, previous_number, editions} for a chapter this edition doesn't have yet; or null
 * when the story or chapter doesn't exist or this caller may not read it.
 * Errors: none.
 * Where it fits: src/features/reading/ reader page.
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
  first_edition public.stories;
  chapter public.chapters;
  source_chapter public.chapters;
  source_ids uuid[];
  place integer;
  earlier_place integer;
  story_json jsonb;
  editions_json jsonb;
  text_to_send text;
  teaser_words integer;
  app_only boolean;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  select * into first_edition from public.stories
  where stories.id = coalesce(story.edition_of_story_id, story.id);

  -- Step 2: the chapter, published and not moderated away. `source_chapter` is the first
  -- edition's chapter it stands for (itself, in a story with one language).
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id;
  if found and public.chapter_is_readable(chapter.id) then
    select * into source_chapter from public.chapters
    where chapters.id = coalesce(chapter.translation_of_chapter_id, chapter.id);
  elsif story.edition_of_story_id is not null then
    -- A chapter of the first edition asked for under this edition's address: the reader switched
    -- language or followed "next" onto a chapter that may not be translated yet.
    select * into source_chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = first_edition.id;
    if not found or not public.chapter_is_readable(source_chapter.id) then
      return null;
    end if;
    select * into chapter from public.chapters
    where chapters.story_id = story.id and chapters.translation_of_chapter_id = source_chapter.id
      and public.chapter_is_readable(chapters.id);
    if not found then
      chapter := null;
    end if;
  else
    return null;
  end if;

  -- Step 3: its place among the story's chapters readers can open, for "Chapter n of N" and the
  -- arrows. Every edition counts in the first edition's chapters, so the number stays the same
  -- when the reader changes language.
  select array_agg(others.id order by others.position) into source_ids
  from public.chapters as others
  where others.story_id = first_edition.id and public.chapter_is_readable(others.id);
  place := array_position(source_ids, source_chapter.id);

  story_json := jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'language_code', story.language_code,
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle,
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id));

  editions_json := public.story_editions_json(story, source_chapter.id);

  -- Step 4: this edition doesn't have the chapter yet (handoff, "A chapter that isn't translated").
  -- The answer names the original to read instead and the nearest earlier chapter this edition has.
  if chapter.id is null then
    select max(earlier.spot) into earlier_place
    from unnest(source_ids) with ordinality as earlier (source_id, spot)
    where earlier.spot < place and exists (
      select 1 from public.chapters as translations
      where translations.story_id = story.id and translations.translation_of_chapter_id = earlier.source_id
        and public.chapter_is_readable(translations.id));
    return jsonb_build_object(
      'missing_translation', true,
      'story', story_json,
      'number', place,
      'total', array_length(source_ids, 1),
      'original', jsonb_build_object(
        'slug', first_edition.slug,
        'language_code', first_edition.language_code,
        'code', source_chapter.code,
        'title', source_chapter.published_title),
      -- "Ana Vlad has translated chapters 1 to 4": the unbroken run from chapter one, and the
      -- translator of a classic (a member's story is translated by its writer).
      'translated_through', coalesce((
        select min(gaps.spot) - 1
        from unnest(source_ids) with ordinality as gaps (source_id, spot)
        where not exists (
          select 1 from public.chapters as translations
          where translations.story_id = story.id and translations.translation_of_chapter_id = gaps.source_id
            and public.chapter_is_readable(translations.id))), 0),
      'translator_name', (select works.translator_name from public.classic_works as works
        where works.story_id = story.id),
      'previous_number', earlier_place,
      'previous_code', case when earlier_place is not null then
        public.edition_chapter_code(story.id, first_edition.id, source_ids[earlier_place]) end,
      'editions', editions_json);
  end if;

  -- Step 5: the text. GAPS-15: none on the web while "In the app only" applies, except for the
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

  -- Step 6: the answer, with the pictures and cards in the text that is sent.
  return jsonb_build_object(
    'story', story_json,
    'id', chapter.id,
    'code', chapter.code,
    'title', chapter.published_title,
    'number', place,
    'total', array_length(source_ids, 1),
    'previous_code', case when place > 1 then
      public.edition_chapter_code(story.id, first_edition.id, source_ids[place - 1]) end,
    'next_code', case when place < array_length(source_ids, 1) then
      public.edition_chapter_code(story.id, first_edition.id, source_ids[place + 1]) end,
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
    'embeds', public.chapter_embed_states(text_to_send, story.user_id),
    -- TRANSLATE-1a: the "Read in" switch, each language with its address for this same chapter;
    -- empty for a story in one language (Robert, 16 Nov 2026, 12:23 UTC).
    'editions', editions_json,
    -- The language the story was written in and a classic's translator, for the credit under
    -- the title; only for a story in several languages.
    'edition', case when jsonb_array_length(editions_json) > 0 then public.story_edition_json(story) end);
end;
$$;

/* ---------- 7. Scores, and the writer's existing actions ---------- */

/**
 * The nightly ranking scores (S1-E5-03 and later, redefined for TRANSLATE-1a).
 * What changed: step 3. A story in several languages has one score: every edition carries the
 * sum of its editions' scores, so reads and likes in any language lift the story as a whole
 * (Robert, 16 Nov 2026, 12:20 UTC) and the order of a list doesn't depend on which edition a
 * reader is shown.
 * Inputs: none. Returns: how many stories were scored. Errors: none of its own.
 * Where it fits: the pg_cron ranking job.
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
  shares_weight double precision := public.ranking_setting('ranking_weight_shares', 10);
  through_weight double precision := public.ranking_setting('ranking_weight_read_through', 0.5);
  follows_weight double precision := public.ranking_setting('ranking_weight_follows', 6);
  finishes_weight double precision := public.ranking_setting('ranking_weight_finishes', 2);
  growth_weight double precision := public.ranking_setting('ranking_weight_growth', 0.5);
  scored integer;
begin
  -- Step 1: a score for every readable story: the weighted sum, lifted by read-through and growth.
  insert into public.story_scores (story_id, score, computed_at)
  select signals.story_id,
    greatest(0, (signals.reads * reads_weight + signals.likes * likes_weight
      + signals.comments * comments_weight + coalesce(shares.points, 0) * shares_weight
      + coalesce(more.follows, 0) * follows_weight + coalesce(more.finish_points, 0) * finishes_weight)
      * (1 + signals.read_through * through_weight)
      * (1 + coalesce(more.growth, 0) * growth_weight)),
    now()
  from public.story_signals() as signals
  left join public.story_share_points() as shares on shares.story_id = signals.story_id
  left join public.story_more_signals() as more on more.story_id = signals.story_id
  on conflict (story_id) do update set score = excluded.score, computed_at = excluded.computed_at;
  get diagnostics scored = row_count;

  -- Step 2: a story with no readable chapter left drops out of the scores.
  delete from public.story_scores
  where not public.story_has_readable_chapter(story_scores.story_id);

  -- Step 3 (TRANSLATE-1a): one score per story, shared by its language editions.
  with families as (
    select coalesce(stories.edition_of_story_id, stories.id) as first_edition_id,
      sum(story_scores.score) as score, count(*) as editions
    from public.story_scores
    join public.stories on stories.id = story_scores.story_id
    group by coalesce(stories.edition_of_story_id, stories.id)
  )
  update public.story_scores set score = families.score
  from families, public.stories
  where families.editions > 1
    and stories.id = story_scores.story_id
    and coalesce(stories.edition_of_story_id, stories.id) = families.first_edition_id;
  return scored;
end;
$$;

/**
 * Tells followers about a newly published chapter (S1-E7-01, redefined for TRANSLATE-1a).
 * What changed: a translated chapter tells only the people who follow the story, in any of its
 * languages ("Following the story? You get a notification when chapter 5 comes out in English",
 * handoff). The writer's followers heard about the chapter when the original came out, so they
 * aren't told again for every language.
 * Inputs: the job's payload {story_id, chapter_id}. Returns: nothing. Errors: none of its own.
 * Where it fits: run_notification_jobs(), every minute.
 */
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
      -- TRANSLATE-1a: not again for a translation.
      and story.edition_of_story_id is null
    union
    select follows_stories.user_id from public.follows_stories where follows_stories.story_id = story.id
    union
    -- TRANSLATE-1a: a translation also tells whoever follows the story in another language.
    select follows_stories.user_id from public.follows_stories
    where story.edition_of_story_id is not null
      and follows_stories.story_id in (select public.story_family_ids(story.id))
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

/**
 * A writer adds a chapter to their own story (S1-E3-02, redefined for TRANSLATE-1a).
 * What changed: a later language edition has no chapters of its own; each of its chapters
 * translates one of the story's, started with start_chapter_translation(). Asked for an edition,
 * this answers 'is_translation' so the screen can send the writer to the right place.
 * Inputs: the story's slug.
 * Returns: {outcome: 'ok', code, position} or {outcome: 'not_active' | 'not_found' | 'is_translation'}.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Add a chapter" in src/features/writing/.
 */
create or replace function public.create_chapter(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  new_code text;
  new_position integer;
begin
  -- Step 1: a signed-in writer who may write, and their own live story (the account gate).
  if caller_id is null then
    raise exception 'Sign in to add a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from public.stories
      where stories.id = target_story_id and stories.edition_of_story_id is not null) then
    return jsonb_build_object('outcome', 'is_translation');
  end if;
  -- Step 2: the next position after the story's live chapters, and a fresh address.
  select coalesce(max(chapters.position), 0) + 1 into new_position
  from public.chapters where chapters.story_id = target_story_id and chapters.deleted_at is null;
  new_code := public.chapter_code();
  insert into public.chapters (story_id, user_id, code, position)
  values (target_story_id, caller_id, new_code, new_position);
  return jsonb_build_object('outcome', 'ok', 'code', new_code, 'position', new_position);
end;
$$;

/**
 * A writer publishes one of their chapters now (S1-E3-03, redefined for TRANSLATE-1a).
 * What changed: a translated chapter can be published only once the chapter it translates is
 * published ('original_not_published'); readers couldn't open it before then anyway.
 * Inputs: the chapter's code.
 * Returns: {outcome: 'ok', published_at} or {outcome: a gate refusal | 'wrong_state' | 'empty' |
 * 'original_not_published'}.
 * Errors: those of chapter_gate_outcome() and chapter_publish_now().
 * Where it fits: "Publish" in the chapter editor.
 */
create or replace function public.publish_chapter(chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status = 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  -- TRANSLATE-1a: a translation goes out only after the chapter it translates.
  if chapter.translation_of_chapter_id is not null and not exists (
      select 1 from public.chapters as originals
      where originals.id = chapter.translation_of_chapter_id
        and originals.status = 'published' and originals.deleted_at is null) then
    return jsonb_build_object('outcome', 'original_not_published');
  end if;
  perform public.chapter_publish_now(chapter);
  return jsonb_build_object('outcome', 'ok', 'published_at', now());
end;
$$;

/**
 * A writer schedules one of their chapters (S1-E3-03, redefined for TRANSLATE-1a).
 * What changed: as publish_chapter(), a translated chapter can be scheduled only once the
 * chapter it translates is published ('original_not_published').
 * Inputs: the chapter's code; when to publish it (within a year).
 * Returns: {outcome: 'ok', scheduled_for} or {outcome: a gate refusal | 'wrong_state' | 'empty' |
 * 'bad_time' | 'original_not_published'}.
 * Errors: those of chapter_gate_outcome().
 * Where it fits: "Schedule" in the chapter editor.
 */
create or replace function public.schedule_chapter(chapter_code text, publish_at timestamp with time zone)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status = 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  if publish_at is null or publish_at <= now() or publish_at > now() + interval '1 year' then
    return jsonb_build_object('outcome', 'bad_time');
  end if;
  -- TRANSLATE-1a: a translation goes out only after the chapter it translates.
  if chapter.translation_of_chapter_id is not null and not exists (
      select 1 from public.chapters as originals
      where originals.id = chapter.translation_of_chapter_id
        and originals.status = 'published' and originals.deleted_at is null) then
    return jsonb_build_object('outcome', 'original_not_published');
  end if;
  update public.chapters set status = 'scheduled', scheduled_for = publish_at where chapters.id = chapter.id;
  return jsonb_build_object('outcome', 'ok', 'scheduled_for', publish_at);
end;
$$;

/**
 * A writer deletes their own story (S1-E3-01, redefined for TRANSLATE-1a).
 * What changed: deleting a story takes its other language editions and their chapters with it,
 * stamped with the same moment so undo brings back exactly those. Deleting one later edition
 * removes only that language.
 * Inputs: the story's slug.
 * Returns: {outcome: 'ok', purge_on} or {outcome: 'not_active' | 'not_found'}.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Delete story" in Story settings; "Remove this language" for an edition.
 */
create or replace function public.delete_my_story(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  deleted_time timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to delete a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Hidden at once: every reader path checks deleted_at; the owner still sees it for undo.
  -- TRANSLATE-1a: the later editions first (an edition can't stay live without its story).
  update public.chapters set deleted_at = deleted_time
  where chapters.deleted_at is null and chapters.story_id in (
    select editions.id from public.stories as editions
    where editions.edition_of_story_id = target_story_id and editions.deleted_at is null);
  update public.stories set deleted_at = deleted_time
  where stories.edition_of_story_id = target_story_id and stories.deleted_at is null;
  update public.stories set deleted_at = deleted_time where stories.id = target_story_id;
  -- The chapters go with it, stamped with the same moment so undo brings back exactly these.
  update public.chapters set deleted_at = deleted_time
  where chapters.story_id = target_story_id and chapters.deleted_at is null;
  return jsonb_build_object('outcome', 'ok',
    'purge_on', ((deleted_time + make_interval(days => purge_days)) at time zone 'Europe/Bucharest')::date);
end;
$$;

/**
 * A writer brings back a story they deleted (S1-E3-01, redefined for TRANSLATE-1a).
 * What changed: restoring a story also restores the language editions and chapters that were
 * deleted with it (the same moment). A later edition on its own can't come back while its story
 * is still deleted ('story_deleted').
 * Inputs: the story's slug.
 * Returns: {outcome: 'ok'} or {outcome: 'not_active' | 'not_found' | 'story_deleted'}.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Undo" after deleting a story.
 */
create or replace function public.restore_my_story(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  story public.stories;
begin
  if caller_id is null then
    raise exception 'Sign in to restore a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  -- Step 1: the caller's own deleted story at that address, still within the undo time.
  select * into story from public.stories
  where stories.slug = story_slug and stories.user_id = caller_id
    and stories.deleted_at is not null
    and stories.deleted_at > now() - make_interval(days => purge_days);
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- TRANSLATE-1a: a later edition needs its story back first.
  if story.edition_of_story_id is not null and exists (
      select 1 from public.stories as first_editions
      where first_editions.id = story.edition_of_story_id and first_editions.deleted_at is not null) then
    return jsonb_build_object('outcome', 'story_deleted');
  end if;
  -- Step 2: the story and the chapters that went with it (same deleted_at) come back.
  update public.chapters set deleted_at = null
  where chapters.story_id = story.id and chapters.deleted_at = story.deleted_at;
  update public.stories set deleted_at = null where stories.id = story.id;
  -- TRANSLATE-1a: and the editions that went with it, with their chapters.
  update public.chapters set deleted_at = null
  where chapters.deleted_at = story.deleted_at and chapters.story_id in (
    select editions.id from public.stories as editions
    where editions.edition_of_story_id = story.id and editions.deleted_at = story.deleted_at);
  update public.stories set deleted_at = null
  where stories.edition_of_story_id = story.id and stories.deleted_at = story.deleted_at;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
