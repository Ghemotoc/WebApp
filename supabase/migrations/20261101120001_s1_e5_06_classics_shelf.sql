/*
 * Migration: the classics shelf on Discover (story S1-E5-06) and the rest of staff Classics work
 * (story S1-E11-16, part 16b): importing the research lists, the 1 January suggestions and typo
 * fixes kept as versions with a reason.
 *
 * What it adds:
 * - A story list kind 'classics': the public-domain works (stories with a real author byline,
 *   classic_author_id). It works like any other list: one line of at most 20 on Discover with
 *   "View more" to /discover/all/classics (S1-E5-09), and the reader's rules (ratings, blocks,
 *   moderation) apply through listed_stories().
 * - is_story_list_kind(): the one list of kinds browse_stories() accepts, so the next new kind
 *   changes only this helper.
 * - The Discover setting discover_shelves gains 'classics' before the category shelves, when
 *   staff haven't changed it.
 * - classic_works.details_checked: an imported row has its details filled in from the list, but
 *   staff must check the rating, category and source before it can be published (S1-E11-16 AC 7).
 * - admin_import_classics(): turns the rows of a content/classics list into draft works.
 * - admin_classic_suggestions(): the authors whose works became free on 1 January this year,
 *   and next year's (S1-E11-16 AC 8; Law 8/1996 art. 28(1) and 34).
 * - admin_classic_chapter() and admin_fix_classic_typo(): staff correct a typo from the source in
 *   a live classic; the old text stays as a version and the reason is in the audit log. A change
 *   bigger than a typo is refused: staff never rewrite or abridge a work (S1-E11-16 AC 4).
 * Where it fits: Discover (src/features/discovery/) and Staff › Classics
 *   (src/features/staff/components/classics/).
 */

/* ---------- The classics list ---------- */

/**
 * list_holds_story: whether a story belongs to a list, before the reader's rules.
 * As in S1-E5-04, plus 'classics' (S1-E5-06): the public-domain works, which carry their real
 *   author's byline. Internal: listed_stories().
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
    when 'popular' then true
    when 'rising' then (
      select min(earlier.first_published_at) from public.stories as earlier
      where earlier.user_id = target.user_id and earlier.deleted_at is null
    ) >= now() - make_interval(days => coalesce(public.setting_value('rising_writer_days') #>> '{}', '90')::integer)
    when 'completed' then target.completion_status = 'completed'
    when 'category' then exists (
      select 1 from public.categories where categories.id = target.category_id and categories.slug = list_key)
    -- CMS-1e: the tag a name stands for in any language ("fantezie" is Fantasy), approved only.
    when 'tag' then exists (
      select 1 from public.story_tags
      where story_tags.story_id = target.id and story_tags.tag_id = public.tag_for_name(list_key))
    when 'following' then exists (
      select 1 from public.follows_users
      where follows_users.user_id = (select auth.uid()) and follows_users.followed_user_id = target.user_id)
    when 'writer' then target.user_id = (select profile.id from public.profile_for_handle(list_key) as profile)
    -- S1-E5-04: the stories that answer the search term.
    when 'search' then public.story_matches_search(target, list_key)
    -- S1-E5-06: the public-domain classics.
    when 'classics' then target.classic_author_id is not null
    else false
  end;
$$;

/**
 * is_story_list_kind: whether browse_stories() knows a list.
 * Input: the kind. Returns: true for a known kind. Internal: browse_stories().
 */
create or replace function public.is_story_list_kind(list_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select list_kind in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag',
    'following', 'writer', 'search', 'classics');
$$;
comment on function public.is_story_list_kind(text) is 'Internal: the story lists browse_stories() accepts (S1-E5-06).';
revoke execute on function public.is_story_list_kind(text) from public, anon, authenticated;

/**
 * browse_stories: one page of a story list and how many it holds.
 * As in S1-E5-04; list_kind adds 'classics' (S1-E5-06), checked by is_story_list_kind().
 * Returns: JSON {total, stories: [story_card_json(), ...]}.
 * Errors: invalid_parameter_value for an unknown list_kind or sort_order, a missing list_key,
 *   'relevance' on a list that isn't a search, or a negative page_offset.
 * Where it fits: every shelf on Discover, every See all page and the search page's stories.
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
  ordering text := coalesce(sort_order, public.list_default_sort(list_kind));
  total integer;
  page jsonb;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or not public.is_story_list_kind(list_kind) then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer', 'search') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('popular', 'updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer', 'relevance')
      or (ordering = 'relevance' and list_kind <> 'search') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 2: how many the list holds for this reader, for "24 stories" and "View all 24".
  select count(*) into total from public.listed_stories(list_kind, list_key, category_slug, completion, language);
  -- Step 3: the page, in the chosen order. Only one of the sort lines below is switched on (the
  -- others are null for every row); the last two lines break ties: the newer story, then the
  -- address, so pages never overlap. A story the job hasn't scored yet counts as 0.
  select coalesce(jsonb_agg(public.story_card_json(ordered.id) order by ordered.position), '[]'::jsonb) into page
  from (
    select listed.id, row_number() over (order by
        case when ordering = 'relevance' then public.story_search_rank(listed, list_key) end desc,
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
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed
    join public.profiles on profiles.id = listed.user_id
    left join public.story_scores as scores on scores.story_id = listed.id
    order by position
    limit wanted_rows offset coalesce(page_offset, 0)
  ) as ordered;
  return jsonb_build_object('total', total, 'stories', page);
end;
$$;

-- The classics shelf goes before the category shelves, unless staff already changed the order.
update public.settings
set value = '["following", "popular", "rising", "new", "completed", "updated", "classics", "categories"]'::jsonb
where key = 'discover_shelves'
  and value = '["following", "popular", "rising", "new", "completed", "updated", "categories"]'::jsonb;

/* ---------- Imported works wait for staff to check them ---------- */

alter table public.classic_works add column details_checked boolean not null default true;
comment on column public.classic_works.details_checked is
  'False for a work imported from a research list until staff save its details: the rating, category and source must be checked before publishing (S1-E11-16b).';

/**
 * classic_work_json: one classic's details for the staff page.
 * As in S1-E11-16a, plus details_checked and each chapter's code (for typo fixes, 16b).
 * Internal.
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
    'details_checked', works.details_checked,
    'free_markets', public.classic_free_markets(classic_authors.died_year, works.translator_died_year,
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

/**
 * admin_save_classic_work: saves a classic's details: a new draft work, or changes to one.
 * As in S1-E11-16a; saving also marks an imported work's details as checked (16b).
 * Inputs: the details JSON and the story's id (left out for a new work).
 * Returns: classic_work_json() of the saved work. Errors: not_allowed, classics_account_missing,
 *   details_invalid, not_a_classic, and the tables' checks (check_violation).
 * Where it fits: the staff form's "Save" (S1-E11-16 AC 1).
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
  -- Step 2: the public-domain details, kept beside it. A person saved them, so they are checked.
  insert into public.classic_works (story_id, kind, original_language, source_title, source_url,
    translator_name, translator_died_year, first_published_year, added_by_user_id, details_checked)
  values (saved_story_id, (details ->> 'kind')::public.classic_kind, details ->> 'original_language',
    btrim(details ->> 'source_title'), btrim(details ->> 'source_url'),
    nullif(btrim(coalesce(details ->> 'translator_name', '')), ''),
    (details ->> 'translator_died_year')::integer, (details ->> 'first_published_year')::integer,
    (select auth.uid()), true)
  on conflict (story_id) do update set kind = excluded.kind,
    original_language = excluded.original_language, source_title = excluded.source_title,
    source_url = excluded.source_url, translator_name = excluded.translator_name,
    translator_died_year = excluded.translator_died_year,
    first_published_year = excluded.first_published_year, details_checked = true;
  -- Step 3: the audit log, then the saved work.
  perform public.log_staff_action('classics.work_saved', 'stories', saved_story_id::text,
    public.classics_account_id(), null, before_values, public.classic_work_json(saved_story_id));
  return public.classic_work_json(saved_story_id);
end;
$$;

/**
 * admin_publish_classic: puts every chapter of a classic live at once.
 * As in S1-E11-16a, and an imported work must have its details checked first (16b).
 * Inputs: the story's id. Returns: classic_work_json(). Errors: not_allowed, not_a_classic;
 *   check_violation with hint not_free_in_romania, details_unchecked or no_chapters.
 * Where it fits: the staff page's "Publish" (S1-E11-16 AC 4 and 6).
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
  -- Step 2: a work from a research list is checked by a person before it goes live (16b).
  if not (work ->> 'details_checked')::boolean then
    raise exception 'Check and save the details first.' using errcode = 'check_violation', hint = 'details_unchecked';
  end if;
  if jsonb_array_length(work -> 'chapters') = 0 then
    raise exception 'Add the text first.' using errcode = 'check_violation', hint = 'no_chapters';
  end if;
  -- Step 3: every chapter that isn't live goes live, in order.
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

/* ---------- Importing the research lists ---------- */

/**
 * classic_kind_from_list: the kind of work for a research list's "type" column.
 * Input: the type as written in content/classics ("novel", "short story cycle", "poetry / folk
 *   tales", "travel prose" and so on). Returns: the kind, or null when the type is unknown.
 * Internal: classic_import_row().
 */
create or replace function public.classic_kind_from_list(list_type text)
returns public.classic_kind
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(btrim(list_type)) like 'novel%' then 'novel'
    when lower(btrim(list_type)) like 'short %' then 'short_story'
    when lower(btrim(list_type)) like 'fairy tale%' then 'fairy_tale'
    when lower(btrim(list_type)) like 'poe%' then 'poem'
    when lower(btrim(list_type)) like 'play%' then 'play'
    when lower(btrim(list_type)) like 'essay%' then 'essay'
    when lower(btrim(list_type)) like 'travel %' then 'essay'
  end::public.classic_kind;
$$;
comment on function public.classic_kind_from_list(text) is 'Internal: a research list''s type as a classic_kind (S1-E11-16b).';
revoke execute on function public.classic_kind_from_list(text) from public, anon, authenticated;

/**
 * classic_source_title: the name of the site a source link points to, for the source line.
 * Input: the link. Returns: "Wikisource", "Project Gutenberg", "Standard Ebooks" or the host.
 * Internal: classic_import_row().
 */
create or replace function public.classic_source_title(source_link text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when source_link ~ '^https://([a-z]+\.)?wikisource\.org/' then 'Wikisource'
    when source_link ~ '^https://(www\.)?gutenberg\.org/' then 'Project Gutenberg'
    when source_link ~ '^https://(www\.)?standardebooks\.org/' then 'Standard Ebooks'
    else substring(source_link from '^https://([^/]+)')
  end;
$$;
comment on function public.classic_source_title(text) is 'Internal: the site a classic''s source link points to (S1-E11-16b).';
revoke execute on function public.classic_source_title(text) from public, anon, authenticated;

/**
 * classic_import_row: makes one draft work from one row of a research list.
 * Input: the row {title, author, author_died, type, language, source_url}.
 * Returns: 'added' or 'already_listed'. Errors: check_violation with a hint naming what is wrong
 *   (row_incomplete, unknown_kind, unknown_language, author_died_year_differs) and the tables'
 *   own checks. Internal: admin_import_classics(), which catches each row's error.
 */
create or replace function public.classic_import_row(list_row jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_title text := public.normalise_romanian_letters(btrim(coalesce(list_row ->> 'title', '')));
  wanted_kind public.classic_kind := public.classic_kind_from_list(list_row ->> 'type');
  wanted_language text := lower(btrim(coalesce(list_row ->> 'language', '')));
  author_id uuid;
  new_story_id uuid;
begin
  -- Step 1: every field the draft needs, in a form the database knows.
  if clean_title = '' or coalesce(btrim(list_row ->> 'author'), '') = ''
     or coalesce(list_row ->> 'author_died', '') !~ '^\d{1,4}$'
     or coalesce(list_row ->> 'source_url', '') !~ '^https://' then
    raise exception 'A field is missing.' using errcode = 'check_violation', hint = 'row_incomplete';
  end if;
  if wanted_kind is null then
    raise exception 'Unknown kind of work.' using errcode = 'check_violation', hint = 'unknown_kind';
  end if;
  if not exists (select 1 from public.languages where languages.code = wanted_language) then
    raise exception 'Unknown language.' using errcode = 'check_violation', hint = 'unknown_language';
  end if;
  -- Step 2: the author, found by name or added (a different year of death is refused).
  author_id := public.admin_add_classic_author(list_row ->> 'author', (list_row ->> 'author_died')::integer);
  -- Step 3: the same title by the same author is the same work.
  if exists (select 1 from public.stories where stories.classic_author_id = author_id
             and lower(stories.title) = lower(clean_title) and stories.deleted_at is null) then
    return 'already_listed';
  end if;
  -- Step 4: the draft story, rated All ages until staff check it, and its details. Poems go to
  -- Poetry, essays to Nonfiction and essays, the rest to Fiction.
  new_story_id := public.classic_upsert_story(null, jsonb_build_object('title', clean_title, 'blurb', '',
      'language_code', wanted_language, 'rating', 'all_ages', 'author_id', author_id),
    (select categories.id from public.categories where categories.slug = case wanted_kind
       when 'poem' then 'poetry' when 'essay' then 'nonfiction_essays' else 'fiction' end));
  insert into public.classic_works (story_id, kind, original_language, source_title, source_url,
    added_by_user_id, details_checked)
  values (new_story_id, wanted_kind, wanted_language, public.classic_source_title(list_row ->> 'source_url'),
    btrim(list_row ->> 'source_url'), (select auth.uid()), false);
  return 'added';
end;
$$;
comment on function public.classic_import_row(jsonb) is 'Internal: one research list row as a draft classic (S1-E11-16b).';
revoke execute on function public.classic_import_row(jsonb) from public, anon, authenticated;

/**
 * admin_import_classics: turns the rows of a research list (the CSV files in content/classics) into draft
 *   works, with their details filled in. The text still has to be added and every work checked
 *   before it is published (S1-E11-16 AC 7).
 * Inputs: a JSON list of rows {title, author, author_died, type, language, source_url}, the
 *   list's columns as the staff page reads them from the CSV file (at most 500 rows).
 * Returns: JSON {added, already_listed, refused: [{line, title, reason}]}; line counts the rows
 *   from 1. A row that can't be imported is refused on its own; the others still come in.
 * Errors: not_allowed; classics_account_missing; check_violation (hint too_many_rows) for more
 *   than 500 rows or a list that isn't one.
 * Where it fits: Staff › Classics › "Import a list". Logged once with the counts.
 */
create or replace function public.admin_import_classics(list_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  list_row jsonb;
  line_number integer;
  added integer := 0;
  already_listed integer := 0;
  refused jsonb := '[]'::jsonb;
  failure_hint text;
begin
  perform public.require_classics_staff();
  -- The drafts belong to the classics account; without it nothing can be imported.
  perform public.classics_account_id();
  if jsonb_typeof(list_rows) is distinct from 'array' or jsonb_array_length(list_rows) > 500 then
    raise exception 'Import at most 500 rows at a time.' using errcode = 'check_violation', hint = 'too_many_rows';
  end if;
  -- Each row in its own sub-transaction, so one bad row doesn't stop the rest.
  for list_row, line_number in select rows.value, rows.position from jsonb_array_elements(list_rows)
    with ordinality as rows (value, position)
  loop
    begin
      if public.classic_import_row(list_row) = 'added' then
        added := added + 1;
      else
        already_listed := already_listed + 1;
      end if;
    exception when others then
      get stacked diagnostics failure_hint = pg_exception_hint;
      refused := refused || jsonb_build_object('line', line_number, 'title', coalesce(list_row ->> 'title', ''),
        'reason', coalesce(nullif(failure_hint, ''), 'row_invalid'));
    end;
  end loop;
  perform public.log_staff_action('classics.list_imported', 'classic_works', null, null, null, null,
    jsonb_build_object('added', added, 'already_listed', already_listed, 'refused', jsonb_array_length(refused)));
  return jsonb_build_object('added', added, 'already_listed', already_listed, 'refused', refused);
end;
$$;
revoke execute on function public.admin_import_classics(jsonb) from public, anon;
grant execute on function public.admin_import_classics(jsonb) to authenticated;

/* ---------- The 1 January suggestions ---------- */

/**
 * classic_authors_dying_in: the listed authors who died in a year, with their works.
 * Input: the year. Returns: JSON list of {name, died_year, works: [{story_id, title,
 *   is_published}]}, by name. Internal: admin_classic_suggestions().
 */
create or replace function public.classic_authors_dying_in(died integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', classic_authors.name, 'died_year', classic_authors.died_year,
      'works', coalesce((
        select jsonb_agg(jsonb_build_object('story_id', stories.id, 'title', stories.title,
            'is_published', stories.first_published_at is not null) order by stories.title)
        from public.stories
        where stories.classic_author_id = classic_authors.id and stories.deleted_at is null), '[]'::jsonb))
    order by classic_authors.name), '[]'::jsonb)
  from public.classic_authors where classic_authors.died_year = died;
$$;
comment on function public.classic_authors_dying_in(integer) is 'Internal: the listed authors who died in a year (S1-E11-16b).';
revoke execute on function public.classic_authors_dying_in(integer) from public, anon, authenticated;

/**
 * admin_classic_suggestions: who became free on 1 January, for staff to add or publish.
 * Returns: JSON {year, free_this_year: [...], free_next_year: [...]}: the listed authors who died
 *   71 years before this year (free since 1 January, Law 8/1996 art. 28(1) and 34: life plus 70
 *   years, counted from 1 January after the death) and those who become free next 1 January,
 *   each with their works (classic_authors_dying_in()). Romanian time decides the year.
 * Errors: not_allowed.
 * Where it fits: Staff › Classics, "Newly free" (S1-E11-16 AC 8). The authors come from the
 *   research lists once imported, or from staff adding them.
 */
create or replace function public.admin_classic_suggestions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  this_year integer := extract(year from (now() at time zone 'Europe/Bucharest'))::integer;
begin
  perform public.require_classics_staff();
  return jsonb_build_object('year', this_year,
    'free_this_year', public.classic_authors_dying_in(this_year - 71),
    'free_next_year', public.classic_authors_dying_in(this_year - 70));
end;
$$;
revoke execute on function public.admin_classic_suggestions() from public, anon;
grant execute on function public.admin_classic_suggestions() to authenticated;

/* ---------- Typo fixes, kept as versions ---------- */

/**
 * admin_classic_chapter: one live classic chapter's text, for the typo fix form.
 * Input: the chapter's code. Returns: JSON {code, title, body, fixes} (fixes: how many corrections
 *   it has had). Errors: not_allowed; no_data_found (hint not_a_classic) for a chapter that isn't
 *   a live classic chapter.
 */
create or replace function public.admin_classic_chapter(target_chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_chapter jsonb;
begin
  perform public.require_classics_staff();
  select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
      'body', chapters.published_body,
      'fixes', (select count(*) from public.chapter_revisions
                where chapter_revisions.chapter_id = chapters.id and chapter_revisions.reason = 'edited'))
    into found_chapter
  from public.chapters
  join public.classic_works on classic_works.story_id = chapters.story_id
  where chapters.code = target_chapter_code and chapters.status = 'published' and chapters.deleted_at is null;
  if found_chapter is null then
    raise exception 'That isn''t a live classic chapter.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  return found_chapter;
end;
$$;
revoke execute on function public.admin_classic_chapter(text) from public, anon;
grant execute on function public.admin_classic_chapter(text) to authenticated;

/**
 * classic_fix_is_small: whether a corrected text is a typo fix and not a rewrite.
 * Inputs: the live text and the corrected one. Returns: true when the word count moves by at most
 *   3 words and the length by at most 2% (at least 20 characters). Internal.
 * Why: staff correct the source edition's typos; they never rewrite or abridge a work
 *   (S1-E11-16 AC 4, proposal).
 */
create or replace function public.classic_fix_is_small(live_text text, corrected_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select abs(public.count_words(corrected_text) - public.count_words(live_text)) <= 3
    and abs(char_length(corrected_text) - char_length(live_text))
        <= greatest(20, ceil(char_length(live_text) * 0.02)::integer);
$$;
comment on function public.classic_fix_is_small(text, text) is 'Internal: a typo fix, not a rewrite (S1-E11-16b).';
revoke execute on function public.classic_fix_is_small(text, text) from public, anon, authenticated;

/**
 * admin_fix_classic_typo: corrects a typo from the source edition in a live classic chapter.
 * Inputs: the chapter's code, the corrected text and the reason ("the source has 'pe' twice").
 * Returns: admin_classic_chapter() after the fix. The old text stays as a version
 *   (chapter_revisions, reason 'edited', taken by the staff member), and the audit log keeps the
 *   reason. Readers see the corrected text at once; nobody is notified.
 * Errors: not_allowed; not_a_classic; check_violation with hint reason_missing, no_change or
 *   too_big (more than a typo: classic_fix_is_small()); check_chapter_text()'s rules (rule 8).
 * Where it fits: Staff › Classics › a published work › "Fix a typo" (S1-E11-16 AC 4).
 */
create or replace function public.admin_fix_classic_typo(target_chapter_code text, corrected_body text, reason_given text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  live_chapter public.chapters;
  clean_body text;
begin
  perform public.require_classics_staff();
  -- Step 1: a live chapter of a classic, and a reason.
  select chapters.* into live_chapter from public.chapters
  join public.classic_works on classic_works.story_id = chapters.story_id
  where chapters.code = target_chapter_code and chapters.status = 'published' and chapters.deleted_at is null;
  if live_chapter.id is null then
    raise exception 'That isn''t a live classic chapter.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Write a reason first.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  -- Step 2: the same rules as any chapter text, and only a small change.
  clean_body := public.check_chapter_text(coalesce(corrected_body, ''));
  if clean_body = live_chapter.published_body then
    raise exception 'Nothing changed.' using errcode = 'check_violation', hint = 'no_change';
  end if;
  if not public.classic_fix_is_small(live_chapter.published_body, clean_body) then
    raise exception 'That is more than a typo fix.' using errcode = 'check_violation', hint = 'too_big';
  end if;
  -- Step 3: the corrected text goes live, and the version keeps it beside the earlier ones.
  update public.chapters set draft_body = clean_body, published_body = clean_body,
    word_count = public.count_words(clean_body), published_word_count = public.count_words(clean_body)
  where chapters.id = live_chapter.id;
  insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
  values (live_chapter.id, live_chapter.user_id, (select auth.uid()), 'edited', live_chapter.published_title, clean_body);
  -- Step 4: the audit log keeps the reason and the size of the change, not the text.
  perform public.log_staff_action('classics.typo_fixed', 'chapters', live_chapter.id::text, live_chapter.user_id,
    btrim(reason_given), jsonb_build_object('words', live_chapter.published_word_count),
    jsonb_build_object('words', public.count_words(clean_body)));
  return public.admin_classic_chapter(target_chapter_code);
end;
$$;
revoke execute on function public.admin_fix_classic_typo(text, text, text) from public, anon;
grant execute on function public.admin_fix_classic_typo(text, text, text) to authenticated;
