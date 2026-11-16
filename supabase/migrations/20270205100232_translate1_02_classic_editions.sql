/**
 * TRANSLATE-1d: a classic in several languages, with the translator named and the translation's
 * rights recorded (Robert, 16 Nov 2026, 11:23 and 12:23 UTC; board TrStaff; handoff "Design:
 * translations handoff").
 *
 * What it is for: staff add an edition of a classic in another language. Like a member's story
 * (…_translate1_01_story_editions.sql), an edition is a stories row linked to the first edition
 * through stories.edition_of_story_id; a classic's edition also has its own classic_works row,
 * which holds its translator and, new here, the rights to the translation. "A translation has
 * its own copyright": a translated classic can't be published until staff have said why it may
 * be shown (public domain, a signed licence, or made for the platform).
 *
 * What it adds or changes:
 * 1. classic_works.translation_rights, and a translator can now be named without a year of death
 *    (a living translator under a licence has none).
 * 2. classic_work_json(): the rights, the edition's first edition, and a public-domain check that
 *    leaves the translator's year out when a licence covers the translation.
 * 3. classic_upsert_story() and admin_save_classic_work(): a new work can be an edition of a
 *    classic; it takes the shared facts (author, kind, rating, category, original language) from
 *    the first edition.
 * 4. admin_set_classic_chapters(): an edition's chapters are tied to the original's, in order.
 * 5. admin_publish_classic(): a translation needs its rights; an edition waits for its original.
 * 6. story_edition_json(): the story page's "About this edition" learns the rights.
 *
 * Who calls it: the staff Classics page (src/features/staff/components/classics/) and the story
 * page (src/features/reading/). No new table, so no new policy or grant: classic_works is still
 * written only through these owner-and-admin functions (require_classics_staff()).
 */

/* ---------- 1. The rights to a translation ---------- */

alter table public.classic_works
  add column translation_rights text
  constraint classic_works_translation_rights_check
    check (translation_rights in ('public_domain', 'signed_licence', 'made_for_platform'));

comment on column public.classic_works.translation_rights is
  'Why a translated classic may be shown: public_domain (the translator''s rights have run out), signed_licence, or made_for_platform. Null until staff choose; a translation can''t be published without it (TRANSLATE-1d).';

-- Until now a translator's name and year of death came together. A living translator whose
-- work is licensed or was made for the platform has a name and no year; a year without a name
-- still makes no sense.
alter table public.classic_works drop constraint classic_works_translator_complete;
alter table public.classic_works
  add constraint classic_works_translator_year_needs_name
    check (translator_died_year is null or translator_name is not null);

/* ---------- 2. One work as the staff page reads it ---------- */

/**
 * One classic as the staff page lists it (S1-E11-16, redefined for TRANSLATE-1d).
 * What it does: as before, plus translation_rights and edition_of_story_id (null for a first
 * edition). The public-domain check leaves the translator's year of death out when a signed
 * licence covers the translation or it was made for the platform: the translator agreed, so only
 * the author's rights decide (Law 8/1996 art. 28(1)).
 * Inputs: the story's ID. Returns: the work as JSON, or null when it isn't a live classic.
 * Errors: none. Where it fits: every admin_*classic* function answers with it.
 */
create or replace function public.classic_work_json(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'story_id', stories.id, 'slug', stories.slug, 'title', stories.title, 'blurb', stories.blurb,
    'language_code', stories.language_code, 'rating', stories.rating,
    'content_note', stories.content_note,
    'category_slug', (select categories.slug from public.categories where categories.id = stories.category_id),
    'author', jsonb_build_object('id', classic_authors.id, 'name', classic_authors.name,
      'died_year', classic_authors.died_year),
    'kind', works.kind, 'original_language', works.original_language,
    'source_title', works.source_title, 'source_url', works.source_url,
    'translator_name', works.translator_name, 'translator_died_year', works.translator_died_year,
    'translation_rights', works.translation_rights,
    'edition_of_story_id', stories.edition_of_story_id,
    'first_published_year', works.first_published_year,
    'details_checked', works.details_checked,
    'free_markets', public.classic_free_markets(classic_authors.died_year,
      case when works.translation_rights in ('signed_licence', 'made_for_platform') then null
           else works.translator_died_year end,
      works.first_published_year, (now() at time zone 'Europe/Bucharest')::date),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'title', chapters.draft_title,
          'word_count', chapters.word_count, 'status', chapters.status) order by chapters.position)
      from public.chapters
      where chapters.story_id = stories.id and chapters.deleted_at is null), '[]'::jsonb),
    -- Once any chapter has been live, the text can't be replaced, only corrected (16b).
    'was_published', exists (select 1 from public.chapters where chapters.story_id = stories.id
      and chapters.deleted_at is null and chapters.first_published_at is not null),
    'updated_at', greatest(stories.updated_at, works.updated_at))
  from public.stories
  join public.classic_works as works on works.story_id = stories.id
  join public.classic_authors on classic_authors.id = stories.classic_author_id
  where stories.id = target_story_id and stories.deleted_at is null;
$$;

/* ---------- 3. Saving a work, which can now be an edition ---------- */

/**
 * Creates or updates the story row of a classic (S1-E11-16, redefined for TRANSLATE-1d).
 * What it does: as before; a new work whose details name edition_of_story_id becomes an edition
 * of that classic. The trigger stories_a_edition_rules then checks it (same owner, another
 * language, a first edition) and copies the settings every edition shares.
 * Inputs: the story's ID (null for a new one), the details, the category.
 * Returns: the story's ID. Errors: no_data_found (not_a_classic) when updating something else;
 * check_violation from the edition rules.
 * Where it fits: step 1 of admin_save_classic_work().
 */
create or replace function public.classic_upsert_story(target_story_id uuid, details jsonb, wanted_category_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_title text := public.normalise_romanian_letters(btrim(coalesce(details ->> 'title', '')));
  saved_story_id uuid := target_story_id;
begin
  if saved_story_id is null then
    -- A new classic: owned by the classics account (owner ids never change), automatic cover.
    insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating,
      content_note, classic_author_id, completion_status, edition_of_story_id)
    values (public.classics_account_id(), public.story_slug_for(clean_title), clean_title,
      coalesce(details ->> 'blurb', ''), details ->> 'language_code', wanted_category_id,
      (details ->> 'rating')::public.story_rating, coalesce(details ->> 'content_note', ''),
      (details ->> 'author_id')::uuid, 'completed',
      nullif(details ->> 'edition_of_story_id', '')::uuid)
    returning id into saved_story_id;
    return saved_story_id;
  end if;
  update public.stories set title = clean_title, blurb = coalesce(details ->> 'blurb', ''),
    language_code = details ->> 'language_code', category_id = wanted_category_id,
    rating = (details ->> 'rating')::public.story_rating,
    content_note = coalesce(details ->> 'content_note', ''),
    classic_author_id = (details ->> 'author_id')::uuid
  where stories.id = saved_story_id and stories.deleted_at is null
    and exists (select 1 from public.classic_works where classic_works.story_id = stories.id);
  if not found then
    raise exception 'That isn''t a classic.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  return saved_story_id;
end;
$$;

/**
 * The details of an edition, completed from its first edition (TRANSLATE-1d).
 * What it does: an edition is the same work in another language, so its author, kind, rating,
 * category, content note, original language and first publication year are the first edition's;
 * staff type only the language, the title, the description, the translator and the rights. A
 * source left empty is the first edition's too. A language the classic already has is refused.
 * Inputs: the first edition's ID, the edition's own ID (null for a new one), the typed details.
 * Returns: the full details admin_save_classic_work() saves.
 * Errors: no_data_found (not_a_classic) when the first edition isn't a live first-edition
 * classic; check_violation (edition_language_taken).
 * Where it fits: admin_save_classic_work(), before anything is written.
 */
create or replace function public.classic_edition_details(first_edition_id uuid, edition_id uuid, details jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_work jsonb := public.classic_work_json(first_edition_id);
begin
  -- Step 1: the work it is an edition of must be a classic that isn't an edition itself.
  if first_work is null or first_work ->> 'edition_of_story_id' is not null then
    raise exception 'That isn''t a classic.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  -- Step 2: one edition per language (the unique index would refuse it with a bare error).
  if exists (select 1 from public.stories
      where (stories.id = first_edition_id or stories.edition_of_story_id = first_edition_id)
        and stories.id is distinct from edition_id and stories.deleted_at is null
        and stories.language_code = details ->> 'language_code') then
    raise exception 'This classic already has that language.'
      using errcode = 'check_violation', hint = 'edition_language_taken';
  end if;
  -- Step 3: the shared facts come from the first edition; the source only when none was typed.
  return details || jsonb_build_object(
    'author_id', first_work -> 'author' ->> 'id',
    'kind', first_work ->> 'kind',
    'rating', first_work ->> 'rating',
    'category_slug', first_work ->> 'category_slug',
    'content_note', first_work ->> 'content_note',
    'original_language', first_work ->> 'original_language',
    'first_published_year', first_work -> 'first_published_year',
    'source_title', coalesce(nullif(btrim(coalesce(details ->> 'source_title', '')), ''), first_work ->> 'source_title'),
    'source_url', coalesce(nullif(btrim(coalesce(details ->> 'source_url', '')), ''), first_work ->> 'source_url'));
end;
$$;
comment on function public.classic_edition_details(uuid, uuid, jsonb) is
  'Internal: an edition''s details completed from its first edition, refusing a language the classic already has (TRANSLATE-1d).';
revoke execute on function public.classic_edition_details(uuid, uuid, jsonb) from public, anon, authenticated;

/**
 * Saves a classic's details (S1-E11-16 AC 1 and 2, redefined for TRANSLATE-1d).
 * What it does: as before, and three things more. A new work whose details name
 * edition_of_story_id is saved as an edition of that classic. An edition, new or existing, takes
 * the facts every edition shares from its first edition (classic_edition_details()). And the
 * rights to a translation (translation_rights) are kept beside the translator.
 * Inputs: the details as JSON; the story's ID to change one (null for a new one).
 * Returns: the saved work (classic_work_json()).
 * Errors: insufficient_privilege unless owner or admin in a staff session; no_data_found
 * (not_a_classic); check_violation (edition_language_taken, or a field the table refuses).
 * Where it fits: "Save" and "Save as draft" on /staff/classics. Nothing is public until
 * admin_publish_classic(). Writes the audit log in the same transaction.
 */
create or replace function public.admin_save_classic_work(details jsonb, target_story_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_values jsonb := case when target_story_id is null then null else public.classic_work_json(target_story_id) end;
  first_edition_id uuid;
  saved_story_id uuid;
begin
  perform public.require_classics_staff();
  -- Step 1: an edition (an existing one, or a new one that names its classic) is completed from
  -- its first edition.
  if target_story_id is null then
    first_edition_id := nullif(details ->> 'edition_of_story_id', '')::uuid;
  else
    select stories.edition_of_story_id into first_edition_id from public.stories where stories.id = target_story_id;
  end if;
  if first_edition_id is not null then
    details := public.classic_edition_details(first_edition_id, target_story_id, details);
  end if;
  -- Step 2: the story itself (title, rating, category, author byline).
  saved_story_id := public.classic_upsert_story(target_story_id, details, public.classic_story_category(details));
  -- Step 3: the public-domain details, kept beside it. A person saved them, so they are checked.
  insert into public.classic_works (story_id, kind, original_language, source_title, source_url,
    translator_name, translator_died_year, translation_rights, first_published_year,
    added_by_user_id, details_checked)
  values (saved_story_id, (details ->> 'kind')::public.classic_kind, details ->> 'original_language',
    btrim(details ->> 'source_title'), btrim(details ->> 'source_url'),
    nullif(btrim(coalesce(details ->> 'translator_name', '')), ''),
    (details ->> 'translator_died_year')::integer,
    nullif(details ->> 'translation_rights', ''),
    (details ->> 'first_published_year')::integer, (select auth.uid()), true)
  on conflict (story_id) do update set kind = excluded.kind,
    original_language = excluded.original_language, source_title = excluded.source_title,
    source_url = excluded.source_url, translator_name = excluded.translator_name,
    translator_died_year = excluded.translator_died_year,
    translation_rights = excluded.translation_rights,
    first_published_year = excluded.first_published_year, details_checked = true;
  -- Step 4: the audit log, then the saved work.
  perform public.log_staff_action('classics.work_saved', 'stories', saved_story_id::text,
    public.classics_account_id(), null, before_values, public.classic_work_json(saved_story_id));
  return public.classic_work_json(saved_story_id);
end;
$$;

/* ---------- 4. An edition's text ---------- */

/**
 * Replaces a draft classic's chapters (S1-E11-16 AC 3, redefined for TRANSLATE-1d).
 * What it does: as before; for an edition, each chapter is tied to the original's chapter with
 * the same number (chapters.translation_of_chapter_id), which is how "Read in" keeps the reader's
 * chapter and how a translation closes when its original does. An edition can't have more
 * chapters than its original.
 * Inputs: the story's ID and the chapters [{title, body}] in order.
 * Returns: the work (classic_work_json()).
 * Errors: insufficient_privilege; no_data_found (not_a_classic); check_violation
 * (already_published, no_chapters, edition_too_many_chapters, or text the checks refuse).
 * Where it fits: "Save the text" on /staff/classics. Writes the audit log.
 */
create or replace function public.admin_set_classic_chapters(target_story_id uuid, chapter_list jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  first_edition_id uuid;
  original_chapter_id uuid;
  chapter jsonb;
  chapter_number integer := 0;
  clean_body text;
begin
  perform public.require_classics_staff();
  -- Step 1: a classic that isn't live yet, and at least one chapter.
  select stories.user_id, stories.edition_of_story_id into owner_id, first_edition_id
  from public.stories
  join public.classic_works on classic_works.story_id = stories.id
  where stories.id = target_story_id and stories.deleted_at is null;
  if owner_id is null then
    raise exception 'That isn''t a classic.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  if exists (select 1 from public.chapters where chapters.story_id = target_story_id
             and chapters.deleted_at is null and chapters.first_published_at is not null) then
    raise exception 'This work has been published; its text can''t be replaced.'
      using errcode = 'check_violation', hint = 'already_published';
  end if;
  if jsonb_typeof(chapter_list) <> 'array' or jsonb_array_length(chapter_list) = 0 then
    raise exception 'Add the text first.' using errcode = 'check_violation', hint = 'no_chapters';
  end if;
  -- Step 2: the old drafts go (they were never public), the new ones come in order.
  update public.chapters set deleted_at = now()
  where chapters.story_id = target_story_id and chapters.deleted_at is null;
  for chapter in select * from jsonb_array_elements(chapter_list) loop
    chapter_number := chapter_number + 1;
    clean_body := public.check_chapter_text(coalesce(chapter ->> 'body', ''));
    -- An edition's chapter translates the original's chapter with the same number.
    original_chapter_id := null;
    if first_edition_id is not null then
      select numbered.id into original_chapter_id
      from (select chapters.id, row_number() over (order by chapters.position) as number
            from public.chapters
            where chapters.story_id = first_edition_id and chapters.deleted_at is null) as numbered
      where numbered.number = chapter_number;
      if original_chapter_id is null then
        raise exception 'An edition can''t have more chapters than its original.'
          using errcode = 'check_violation', hint = 'edition_too_many_chapters';
      end if;
    end if;
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      draft_saved_at, word_count, translation_of_chapter_id)
    values (target_story_id, owner_id, public.chapter_code(), chapter_number,
      left(public.normalise_romanian_letters(btrim(coalesce(chapter ->> 'title', ''))), 120),
      clean_body, now(), public.count_words(clean_body), original_chapter_id);
  end loop;
  -- Step 3: the audit log keeps how many chapters and words, not the text itself.
  perform public.log_staff_action('classics.text_set', 'stories', target_story_id::text, owner_id, null,
    null, jsonb_build_object('chapters', chapter_number));
  return public.classic_work_json(target_story_id);
end;
$$;

/* ---------- 5. Publishing a translation ---------- */

/**
 * Publishes a classic (S1-E11-16 AC 4, redefined for TRANSLATE-1d).
 * What it does: as before (free in Romania today, details checked by a person, text added), and
 * two rules for translations. A translation (an edition, or any classic shown in another
 * language than it was written in) needs its rights recorded: "A translation has its own
 * copyright" (handoff; Law 8/1996 art. 16: a translation is a derived work with rights of its
 * own). When those rights are "public domain" and the translator is named, the translator's
 * year of death is needed, so the check can count their 70 years too. And an edition's chapter
 * goes live only once the chapter it translates is live.
 * Inputs: the story's ID. Returns: the work (classic_work_json()).
 * Errors: insufficient_privilege; no_data_found (not_a_classic); check_violation
 * (translation_rights_missing, translator_year_missing, not_free_in_romania, details_unchecked,
 * no_chapters, original_not_published).
 * Where it fits: "Publish" and "Publish edition" on /staff/classics. Writes the audit log.
 */
create or replace function public.admin_publish_classic(target_story_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  work jsonb;
  chapter public.chapters;
begin
  perform public.require_classics_staff();
  work := public.classic_work_json(target_story_id);
  if work is null then
    raise exception 'That isn''t a classic.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  -- Step 1: a translation says why it may be shown.
  if (work ->> 'edition_of_story_id' is not null or work ->> 'language_code' <> work ->> 'original_language')
     and work ->> 'translation_rights' is null then
    raise exception 'Choose the translation rights first.'
      using errcode = 'check_violation', hint = 'translation_rights_missing';
  end if;
  if work ->> 'translation_rights' = 'public_domain' and work ->> 'translator_name' is not null
     and work ->> 'translator_died_year' is null then
    raise exception 'Add the year the translator died.'
      using errcode = 'check_violation', hint = 'translator_year_missing';
  end if;
  -- Step 2: free in Romania today, or it stays a draft (Law 8/1996 art. 28(1)).
  if not (work -> 'free_markets' ->> 'RO')::boolean then
    raise exception 'This work isn''t in the public domain in Romania yet.'
      using errcode = 'check_violation', hint = 'not_free_in_romania';
  end if;
  -- Step 3: a work from a research list is checked by a person before it goes live (16b).
  if not (work ->> 'details_checked')::boolean then
    raise exception 'Check and save the details first.' using errcode = 'check_violation', hint = 'details_unchecked';
  end if;
  if jsonb_array_length(work -> 'chapters') = 0 then
    raise exception 'Add the text first.' using errcode = 'check_violation', hint = 'no_chapters';
  end if;
  -- Step 4: an edition follows its original: every chapter it translates must be live already.
  if exists (select 1 from public.chapters as translated
      join public.chapters as original on original.id = translated.translation_of_chapter_id
      where translated.story_id = target_story_id and translated.deleted_at is null
        and (original.status <> 'published' or original.deleted_at is not null)) then
    raise exception 'Publish the original first.'
      using errcode = 'check_violation', hint = 'original_not_published';
  end if;
  -- Step 5: every chapter that isn't live goes live, in order.
  for chapter in select * from public.chapters
    where chapters.story_id = target_story_id and chapters.deleted_at is null and chapters.status <> 'published'
    order by chapters.position
  loop
    perform public.chapter_publish_now(chapter);
  end loop;
  perform public.log_staff_action('classics.published', 'stories', target_story_id::text,
    public.classics_account_id(), null, null, null);
  return public.classic_work_json(target_story_id);
end;
$$;

/* ---------- 6. The story page: "Rights" under "About this edition" ---------- */

/**
 * What the story page says about the edition being shown (TRANSLATE-1a, redefined for 1d).
 * What it does: as before, plus is_classic and translation_rights, for the "Rights" row of
 * "About this edition" (board TrStory). A member's story has neither.
 * Inputs: the story being shown.
 * Returns: {original_language, is_original, is_first_edition, first_edition_slug,
 * first_edition_language, chapters_here, chapters_in_story, translator_name, is_classic,
 * translation_rights}. Errors: none.
 * Where it fits: get_story_page().
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
    'translator_name', works.translator_name,
    'is_classic', works.story_id is not null,
    'translation_rights', works.translation_rights)
  from public.stories as first_edition
  left join public.classic_works as works on works.story_id = story.id
  where first_edition.id = coalesce(story.edition_of_story_id, story.id);
$$;
