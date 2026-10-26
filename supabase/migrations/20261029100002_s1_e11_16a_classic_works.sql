/*
 * Migration: staff add, check and publish public-domain classics (story S1-E11-16, part 16a;
 * Robert, 17 Oct 2026: "don't forget how the admins can add these classic public domain works";
 * 25 Oct 2026, 07:15: pick or add the writer's name, the source and credit, then the chapters).
 *
 * What it adds:
 * - classic_works: one row per classic story with what the public-domain check needs (the kind,
 *   original language, source edition and link, translator, first publication year) and who
 *   added it. Read only by staff with the Classics area; written only through admin_* functions.
 * - classic_free_markets(): the per-market check (Romania, the EU and the UK 70 years after the
 *   author's death, counted from 1 January after it, and after the translator's death for a
 *   translation; the US by first publication, 95 years; Law 8/1996 art. 28(1) and 34; research G5).
 * - admin_* functions for the staff Classics page (src/features/staff/components/classics/):
 *   add an author, save a work's details, set its chapters, publish and unpublish, list and open.
 *   Each checks staff_may('classics') (owner and admin, architecture 1.8.3) and writes the audit
 *   log in the same transaction.
 * - story_classic_author() now also carries the source and translator, so the story page shows
 *   "Public domain" with the source edition (S1-E11-16 AC 5).
 * Where it fits: the work is a normal story owned by the official classics account (the setting
 *   classics_account_handle); its byline is the real author (S1-E5-06, classic_authors).
 * Later (16b): importing content/classics lists, the 1 January suggestions, typo versions.
 */

/* ---------- Authors: any year of death ---------- */

-- The fixed 1955 limit would refuse authors who become free on 1 January 2027 (died 1956);
-- classic_free_markets() decides freedom by date instead.
alter table public.classic_authors drop constraint classic_authors_died_year_check;
alter table public.classic_authors add constraint classic_authors_died_year_check
  check (died_year between 1 and 2100);

/* ---------- The classics account's handle is a setting ---------- */

-- Staging already has it from the demo top-up; production needs the account made by hand.
insert into public.settings (key, value, is_public, description) values
  ('classics_account_handle', '"clasice"'::jsonb, true,
   'Handle of the official account that publishes public-domain classics (S1-E5-06, S1-E11-16).')
on conflict (key) do nothing;

/* ---------- What a classic is ---------- */

create type public.classic_kind as enum ('novel', 'short_story', 'fairy_tale', 'poem', 'play', 'essay');
comment on type public.classic_kind is 'The kinds of public-domain work staff add (S1-E11-16).';

create table public.classic_works (
  story_id uuid primary key references public.stories (id),
  kind public.classic_kind not null,
  original_language text not null check (original_language ~ '^[a-z]{2}$'),
  source_title text not null check (btrim(source_title) <> '' and char_length(source_title) <= 200),
  source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 500),
  translator_name text check (translator_name is null or (btrim(translator_name) <> '' and char_length(translator_name) <= 120)),
  translator_died_year integer check (translator_died_year between 1 and 2100),
  first_published_year integer check (first_published_year between 1 and 2100),
  added_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A translation names its translator and when they died; the check needs both.
  constraint classic_works_translator_complete
    check ((translator_name is null) = (translator_died_year is null))
);
comment on table public.classic_works is
  'kind: platform. The public-domain details of a classic story: source edition, translator, first publication (S1-E11-16). Written only by admin_* functions.';

create trigger classic_works_set_updated_at
  before update on public.classic_works
  for each row execute function public.set_updated_at();

alter table public.classic_works enable row level security;

/**
 * Policy classic_works_select_staff: staff whose role has the Classics area read the details.
 * Why: the staff Classics page lists them; readers get the source through story_classic_author()
 * on the story page instead, so the table itself stays closed to them (architecture 1.8.3).
 */
create policy classic_works_select_staff on public.classic_works
  for select to authenticated
  using ((select public.staff_may('classics', 'view')));

grant select on public.classic_works to authenticated;  -- classic_works_select_staff

/* ---------- The public-domain check ---------- */

/**
 * classic_free_markets: where a work is in the public domain on a given day.
 * Inputs: the author's year of death, the translator's (null when not a translation), the year it
 *   was first published (null when unknown) and the day to check.
 * Returns: JSON {"RO": bool, "EU": bool, "UK": bool, "US": bool or null}. Romania, the EU and the
 *   UK: free from 1 January of the 71st year after the death of the author and of the translator
 *   (Law 8/1996 art. 28(1) and 34; research G5). The US: published 95 or more years before that
 *   year (research G5); null when the year is unknown.
 * Where it fits: admin_list_classics(), the staff form's check and admin_publish_classic().
 */
create or replace function public.classic_free_markets(
  author_died_year integer,
  translator_died_year integer,
  first_published_year integer,
  on_day date
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  with checked as (
    select extract(year from on_day)::integer as this_year
  ), life_plus_seventy as (
    select author_died_year + 70 < this_year
      and (translator_died_year is null or translator_died_year + 70 < this_year) as is_free,
      this_year
    from checked
  )
  select jsonb_build_object(
    'RO', is_free, 'EU', is_free, 'UK', is_free,
    'US', case when first_published_year is null then null
               else first_published_year + 95 < this_year end)
  from life_plus_seventy;
$$;
comment on function public.classic_free_markets(integer, integer, integer, date) is
  'Where a work is public domain on a day: {RO, EU, UK, US} (S1-E11-16; Law 8/1996 art. 28(1) and 34; research G5).';
grant execute on function public.classic_free_markets(integer, integer, integer, date) to authenticated;

/* ---------- Internal helpers ---------- */

/**
 * classics_account_id: the official classics account, found by the setting classics_account_handle.
 * Returns: its profile id. Errors: raises with hint classics_account_missing when no live account
 *   has that handle (production: made by hand, see the pull request). Internal.
 */
create or replace function public.classics_account_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  account_id uuid;
begin
  select profiles.id into account_id from public.profiles
  where profiles.handle = (public.setting_value('classics_account_handle') #>> '{}')
    and profiles.deleted_at is null;
  if account_id is null then
    raise exception 'The classics account doesn''t exist yet.'
      using errcode = 'no_data_found', hint = 'classics_account_missing';
  end if;
  return account_id;
end;
$$;
revoke execute on function public.classics_account_id() from public, anon, authenticated;

/**
 * require_classics_staff: the first step of every admin_* function here.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller's role has the Classics
 *   area in a staff session (owner and admin, architecture 1.8.3). Internal.
 */
create or replace function public.require_classics_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('classics', 'act') then
    raise exception 'Only the admin role manages Classics.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
end;
$$;
revoke execute on function public.require_classics_staff() from public, anon, authenticated;

/**
 * classic_work_json: one classic's details for the staff page.
 * Input: the story's id. Returns: JSON with the story fields, the author, the public-domain
 *   details, today's per-market check, the chapters (title, words, status) and whether it was
 *   ever published. Internal.
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
    'first_published_year', works.first_published_year,
    'free_markets', public.classic_free_markets(classic_authors.died_year, works.translator_died_year,
      works.first_published_year, (now() at time zone 'Europe/Bucharest')::date),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('title', chapters.draft_title,
          'word_count', chapters.word_count, 'status', chapters.status) order by chapters.position)
      from public.chapters
      where chapters.story_id = stories.id and chapters.deleted_at is null), '[]'::jsonb),
    -- Once any chapter has been live, the text can't be replaced (typo fixes come with 16b).
    'was_published', exists (select 1 from public.chapters where chapters.story_id = stories.id
      and chapters.deleted_at is null and chapters.first_published_at is not null),
    'updated_at', greatest(stories.updated_at, works.updated_at))
  from public.stories
  join public.classic_works as works on works.story_id = stories.id
  join public.classic_authors on classic_authors.id = stories.classic_author_id
  where stories.id = target_story_id and stories.deleted_at is null;
$$;
revoke execute on function public.classic_work_json(uuid) from public, anon, authenticated;

/* ---------- Staff: authors ---------- */

/**
 * admin_add_classic_author: adds a public-domain author, or finds one already listed.
 * Inputs: the author's name as it appears on the byline and their year of death.
 * Returns: the author's id. Errors: not_allowed; check_violation for a blank name or an
 *   impossible year; a name already listed with another year of death is refused (hint
 *   author_died_year_differs) so two people can't be merged by mistake.
 * Where it fits: the staff form's "Add a new author" (S1-E11-16).
 */
create or replace function public.admin_add_classic_author(author_name text, died integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := public.normalise_romanian_letters(regexp_replace(btrim(coalesce(author_name, '')), '\s+', ' ', 'g'));
  existing public.classic_authors;
  new_id uuid;
begin
  perform public.require_classics_staff();
  -- Step 1: the same name (ignoring case) is the same author, if the year agrees.
  select * into existing from public.classic_authors where lower(classic_authors.name) = lower(clean_name);
  if found then
    if existing.died_year <> died then
      raise exception 'This author is already listed with another year of death.'
        using errcode = 'check_violation', hint = 'author_died_year_differs';
    end if;
    return existing.id;
  end if;
  -- Step 2: a new author; the table's checks refuse a blank name or an impossible year.
  insert into public.classic_authors (name, died_year) values (clean_name, died) returning id into new_id;
  perform public.log_staff_action('classics.author_added', 'classic_authors', new_id::text, null, null,
    null, jsonb_build_object('name', clean_name, 'died_year', died));
  return new_id;
end;
$$;
revoke execute on function public.admin_add_classic_author(text, integer) from public, anon;
grant execute on function public.admin_add_classic_author(text, integer) to authenticated;

/* ---------- Staff: a work's details ---------- */

/**
 * classic_story_category: checks the story part of a work's details. Internal.
 * Input: the details JSON (title, blurb, language_code, category_slug, rating, content_note,
 *   author_id). Returns: the category id. Errors: check_violation (hint details_invalid) for an
 *   unknown category, author or rating; the stories table's own checks catch the lengths.
 */
create or replace function public.classic_story_category(details jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  category_id uuid;
begin
  select categories.id into category_id from public.categories where categories.slug = details ->> 'category_slug';
  if category_id is null
     or not exists (select 1 from public.classic_authors where classic_authors.id = (details ->> 'author_id')::uuid)
     or (details ->> 'rating') is null then
    raise exception 'Pick an author, a category and a rating.' using errcode = 'check_violation', hint = 'details_invalid';
  end if;
  return category_id;
end;
$$;
revoke execute on function public.classic_story_category(jsonb) from public, anon, authenticated;

/**
 * classic_upsert_story: makes the story for a new classic, or updates an existing one's fields.
 * Inputs: the story's id (null for a new work), the details JSON and the category id.
 * Returns: the story's id. Errors: no_data_found (hint not_a_classic) when the id isn't a classic;
 *   the stories table's checks. Internal.
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
      content_note, classic_author_id, completion_status)
    values (public.classics_account_id(), public.story_slug_for(clean_title), clean_title,
      coalesce(details ->> 'blurb', ''), details ->> 'language_code', wanted_category_id,
      (details ->> 'rating')::public.story_rating, coalesce(details ->> 'content_note', ''),
      (details ->> 'author_id')::uuid, 'completed')
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
revoke execute on function public.classic_upsert_story(uuid, jsonb, uuid) from public, anon, authenticated;

/**
 * admin_save_classic_work: saves a classic's details: a new draft work, or changes to one.
 * Inputs: the details JSON (title, blurb, author_id,
 *   kind, original_language, language_code, category_slug, rating, content_note, source_title,
 *   source_url, translator_name, translator_died_year, first_published_year) and the story's id
 *   (left out for a new work).
 * Returns: classic_work_json() of the saved work. Errors: not_allowed, classics_account_missing,
 *   details_invalid, not_a_classic, and the tables' checks (check_violation).
 * Where it fits: the staff form's "Save" (S1-E11-16 AC 1). Nothing is public until it is
 *   published; every save is in the audit log with the before and after details.
 */
create or replace function public.admin_save_classic_work(details jsonb, target_story_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_values jsonb := case when target_story_id is null then null else public.classic_work_json(target_story_id) end;
  saved_story_id uuid;
begin
  perform public.require_classics_staff();
  -- Step 1: the story itself (title, rating, category, author byline).
  saved_story_id := public.classic_upsert_story(target_story_id, details, public.classic_story_category(details));
  -- Step 2: the public-domain details, kept beside it.
  insert into public.classic_works (story_id, kind, original_language, source_title, source_url,
    translator_name, translator_died_year, first_published_year, added_by_user_id)
  values (saved_story_id, (details ->> 'kind')::public.classic_kind, details ->> 'original_language',
    btrim(details ->> 'source_title'), btrim(details ->> 'source_url'),
    nullif(btrim(coalesce(details ->> 'translator_name', '')), ''),
    (details ->> 'translator_died_year')::integer, (details ->> 'first_published_year')::integer,
    (select auth.uid()))
  on conflict (story_id) do update set kind = excluded.kind,
    original_language = excluded.original_language, source_title = excluded.source_title,
    source_url = excluded.source_url, translator_name = excluded.translator_name,
    translator_died_year = excluded.translator_died_year,
    first_published_year = excluded.first_published_year;
  -- Step 3: the audit log, then the saved work.
  perform public.log_staff_action('classics.work_saved', 'stories', saved_story_id::text,
    public.classics_account_id(), null, before_values, public.classic_work_json(saved_story_id));
  return public.classic_work_json(saved_story_id);
end;
$$;
revoke execute on function public.admin_save_classic_work(jsonb, uuid) from public, anon;
grant execute on function public.admin_save_classic_work(jsonb, uuid) to authenticated;

/* ---------- Staff: the text ---------- */

/**
 * admin_set_classic_chapters: replaces a classic's chapters with the ones from the staff preview.
 * Inputs: the story's id and a JSON list of {title, body} in reading order (the page splits the
 *   pasted text at headings; staff can fix the titles first).
 * Returns: classic_work_json() of the work. Errors: not_allowed, not_a_classic; check_violation
 *   with hint already_published once a chapter is live (typo fixes come with 16b, as versions with
 *   a reason), hint no_chapters for an empty list; check_chapter_text()'s rules (rule 8).
 * Where it fits: the staff page's "Save chapters" (S1-E11-16 AC 3). Staff never rewrite a work:
 *   the text is the source edition's.
 */
create or replace function public.admin_set_classic_chapters(target_story_id uuid, chapter_list jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  chapter jsonb;
  chapter_number integer := 0;
  clean_body text;
begin
  perform public.require_classics_staff();
  -- Step 1: a classic that isn't live yet, and at least one chapter.
  select stories.user_id into owner_id from public.stories
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
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, draft_saved_at, word_count)
    values (target_story_id, owner_id, public.chapter_code(), chapter_number,
      left(public.normalise_romanian_letters(btrim(coalesce(chapter ->> 'title', ''))), 120),
      clean_body, now(), public.count_words(clean_body));
  end loop;
  -- Step 3: the audit log keeps how many chapters and words, not the text itself.
  perform public.log_staff_action('classics.text_set', 'stories', target_story_id::text, owner_id, null,
    null, jsonb_build_object('chapters', chapter_number));
  return public.classic_work_json(target_story_id);
end;
$$;
revoke execute on function public.admin_set_classic_chapters(uuid, jsonb) from public, anon;
grant execute on function public.admin_set_classic_chapters(uuid, jsonb) to authenticated;

/* ---------- Staff: publish and unpublish ---------- */

/**
 * admin_publish_classic: puts every chapter of a classic live at once.
 * Inputs: the story's id. Returns: classic_work_json(). Errors: not_allowed, not_a_classic;
 *   check_violation with hint not_free_in_romania (Romania is the open market, decided 17 Oct
 *   2026; other markets' hiding comes when a second market opens, 16b) or no_chapters.
 * Where it fits: the staff page's "Publish" (S1-E11-16 AC 4 and 6): an admin publishes it, and
 *   the audit log records who.
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
  -- Step 1: free in Romania today, or it stays a draft (Law 8/1996 art. 28(1)).
  if not (work -> 'free_markets' ->> 'RO')::boolean then
    raise exception 'This work isn''t in the public domain in Romania yet.'
      using errcode = 'check_violation', hint = 'not_free_in_romania';
  end if;
  if jsonb_array_length(work -> 'chapters') = 0 then
    raise exception 'Add the text first.' using errcode = 'check_violation', hint = 'no_chapters';
  end if;
  -- Step 2: every chapter that isn't live goes live, in order.
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
revoke execute on function public.admin_publish_classic(uuid) from public, anon;
grant execute on function public.admin_publish_classic(uuid) to authenticated;

/**
 * admin_unpublish_classic: takes a classic off the site at once (S1-E11-16 AC 9: a report that it
 *   isn't free, or a wrong text).
 * Inputs: the story's id and the reason. Returns: classic_work_json(). Errors: not_allowed,
 *   not_a_classic; check_violation (hint reason_missing) without a reason.
 */
create or replace function public.admin_unpublish_classic(target_story_id uuid, reason_given text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_classics_staff();
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Write a reason first.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  if public.classic_work_json(target_story_id) is null then
    raise exception 'That isn''t a classic.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  -- The chapters go back to drafts, as a writer's unpublish does (S1-E3-03).
  update public.chapters set status = 'draft', unpublished_at = now()
  where chapters.story_id = target_story_id and chapters.status = 'published' and chapters.deleted_at is null;
  perform public.log_staff_action('classics.unpublished', 'stories', target_story_id::text,
    public.classics_account_id(), btrim(reason_given), null, null);
  return public.classic_work_json(target_story_id);
end;
$$;
revoke execute on function public.admin_unpublish_classic(uuid, text) from public, anon;
grant execute on function public.admin_unpublish_classic(uuid, text) to authenticated;

/* ---------- Staff: reading ---------- */

/**
 * admin_list_classics: every classic, newest change first, for the staff Classics page.
 * Returns: a JSON list of classic_work_json() without the chapter texts. Errors: not_allowed.
 */
create or replace function public.admin_list_classics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_classics_staff();
  return coalesce((
    select jsonb_agg(public.classic_work_json(classic_works.story_id) order by classic_works.updated_at desc)
    from public.classic_works
    join public.stories on stories.id = classic_works.story_id and stories.deleted_at is null), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_list_classics() from public, anon;
grant execute on function public.admin_list_classics() to authenticated;

/**
 * admin_list_classic_authors: the authors staff pick from, by name. Errors: not_allowed.
 */
create or replace function public.admin_list_classic_authors()
returns table (id uuid, name text, died_year integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_classics_staff();
  return query select classic_authors.id, classic_authors.name, classic_authors.died_year
    from public.classic_authors order by classic_authors.name;
end;
$$;
revoke execute on function public.admin_list_classic_authors() from public, anon;
grant execute on function public.admin_list_classic_authors() to authenticated;

/* ---------- Readers: the source on the story page ---------- */

/**
 * story_classic_author: as in S1-E5-06, now with the public-domain details readers see under the
 *   "Public domain" label: the source edition and its link, and the translator if any.
 * Input: target_story_id. Returns: JSON {name, died_year, source_title, source_url,
 *   translator_name}, or null when the story isn't a classic.
 */
create or replace function public.story_classic_author(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', classic_authors.name, 'died_year', classic_authors.died_year,
    'source_title', works.source_title, 'source_url', works.source_url,
    'translator_name', works.translator_name)
  from public.stories
  join public.classic_authors on classic_authors.id = stories.classic_author_id
  left join public.classic_works as works on works.story_id = stories.id
  where stories.id = target_story_id;
$$;
