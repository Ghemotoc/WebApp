/*
 * Migration: the reader's library and their place in every chapter (story S1-E4-03; board 3.7
 * Library).
 *
 * What it adds:
 * - library_shelf: the three shelves, 'reading', 'saved' (for later) and 'finished'.
 * - library_entries: which story sits on which of the reader's shelves (one shelf per story).
 * - reading_positions: how far the reader got in each chapter (0 to 100) and on what kind of
 *   device (phone, tablet or computer, from the screen width; never a device name or address),
 *   so "Continue" works on every device they log in on.
 * - save_reading_position(): the reader screen saves the place; the story joins "Reading" the
 *   first time, and moves to "Finished" at the end of the last chapter of a completed story.
 * - set_library_shelf(): the story page's Library button puts a story on a shelf or takes it off.
 * - my_place_in_chapter(), story_library_state(), my_library(), my_follows(): what the reader,
 *   the story page and the Library page read.
 * - The 'library' story list (browse_stories('library', <shelf>)), for the shelves and their
 *   See all pages; it is empty for everyone but the owner.
 * Privacy: reading history is personal data (S1-E4-03, legal note). Both tables are readable by
 *   their owner only, never by other readers, writers, sponsors or advertisers; the library is
 *   private and there is no setting yet that shares it (S1-E13-01 adds privacy settings).
 *   Saving a place needs no account gate: it changes nothing anyone else sees, so a read-only
 *   account (waiting for a check) keeps its place too.
 * Who calls it: src/features/library/ (the Library page, the Library button), and
 *   src/features/reading/hooks/useSavedPlace.ts (the reader).
 * Tests: supabase/tests/database/179-library.test.sql.
 */

/* ---------- Tables ---------- */

create type public.library_shelf as enum ('reading', 'saved', 'finished');
comment on type public.library_shelf is
  'The shelves of a reader''s library: reading, saved (for later) and finished (S1-E4-03).';

create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  -- The reader whose library it is (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  shelf public.library_shelf not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_entries_one_per_story unique (user_id, story_id)
);
comment on table public.library_entries is
  'kind: user_action
Which story sits on which shelf of a reader''s library (S1-E4-03). Private to the reader.';
create index library_entries_story_id on public.library_entries (story_id);
create trigger library_entries_set_updated_at
  before update on public.library_entries
  for each row execute function public.set_updated_at();
alter table public.library_entries enable row level security;

-- Who: the reader. Why: their own library; nobody else may learn what someone reads (S1-E4-03,
-- private by default). Writes go only through set_library_shelf() and save_reading_position().
create policy library_entries_select_own on public.library_entries
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.library_entries to authenticated;

create table public.reading_positions (
  id uuid primary key default gen_random_uuid(),
  -- The reader (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- How far through the chapter's text, 0 to 100.
  percent smallint not null check (percent between 0 and 100),
  -- The kind of screen, for "on your phone" (board 3.7); never a device name, model or address.
  device_kind text not null check (device_kind in ('phone', 'tablet', 'computer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_positions_one_per_chapter unique (user_id, chapter_id)
);
comment on table public.reading_positions is
  'kind: user_action
How far a reader got in each chapter and on what kind of screen (S1-E4-03). Private to the reader.';
create index reading_positions_story on public.reading_positions (user_id, story_id, updated_at desc);
create index reading_positions_chapter_id on public.reading_positions (chapter_id);
create index reading_positions_story_id on public.reading_positions (story_id);
create trigger reading_positions_set_updated_at
  before update on public.reading_positions
  for each row execute function public.set_updated_at();
alter table public.reading_positions enable row level security;

-- Who: the reader. Why: their own place in each chapter; nobody else sees reading history.
-- Writes go only through save_reading_position().
create policy reading_positions_select_own on public.reading_positions
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.reading_positions to authenticated;

/* ---------- Helpers ---------- */

/**
 * chapter_place: a readable chapter's number among its story's readable chapters, and how many
 * there are ("Chapter 14 of 15").
 * Input: target_chapter_id. Returns: one row (number, total); number is null when the chapter
 *   is no longer readable (unpublished or moderated away).
 * Internal: my_library(), story_library_state().
 */
create or replace function public.chapter_place(target_chapter_id uuid)
returns table (number integer, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  with readable as (
    select others.id, row_number() over (order by others.position)::integer as place
    from public.chapters as others
    where others.story_id = (select chapters.story_id from public.chapters where chapters.id = target_chapter_id)
      and public.chapter_is_readable(others.id)
  )
  select (select readable.place from readable where readable.id = target_chapter_id),
         (select count(*)::integer from readable);
$$;
comment on function public.chapter_place(uuid) is
  'Internal: a chapter''s number among its story''s readable chapters, and how many there are (S1-E4-03).';
revoke execute on function public.chapter_place(uuid) from public, anon, authenticated;

/**
 * latest_place_json: where the caller last was in a story: the most recently saved chapter that
 * is still readable.
 * Input: target_story_id. Returns: JSON {chapter_code, number, total, percent, device_kind,
 *   saved_at, next_code}, where next_code is the chapter after it (null at the last one); or
 *   null when the caller has no place in the story.
 * Internal: my_library(), story_library_state().
 */
create or replace function public.latest_place_json(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'chapter_code', chapters.code,
    'number', place.number,
    'total', place.total,
    'percent', positions.percent,
    'device_kind', positions.device_kind,
    'saved_at', positions.updated_at,
    'next_code', (select later.code from public.chapters as later
      where later.story_id = chapters.story_id and later.position > chapters.position
        and public.chapter_is_readable(later.id)
      order by later.position limit 1))
  from public.reading_positions as positions
  join public.chapters on chapters.id = positions.chapter_id
  cross join lateral public.chapter_place(chapters.id) as place
  where positions.user_id = (select auth.uid())
    and positions.story_id = target_story_id
    and public.chapter_is_readable(chapters.id)
  order by positions.updated_at desc
  limit 1;
$$;
comment on function public.latest_place_json(uuid) is
  'Internal: the caller''s latest readable place in a story (S1-E4-03).';
revoke execute on function public.latest_place_json(uuid) from public, anon, authenticated;

/* ---------- The library as a story list ---------- */

/**
 * list_holds_story: whether a story belongs to a list.
 * As in S1-E5-06, plus 'library': the story is on the caller's shelf named by list_key
 * ('reading', 'saved' or 'finished'; S1-E4-03). Nobody else's library is ever listed.
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
    -- S1-E4-03: one shelf of the caller's own library.
    when 'library' then exists (
      select 1 from public.library_entries
      where library_entries.user_id = (select auth.uid()) and library_entries.story_id = target.id
        and library_entries.shelf::text = list_key)
    else false
  end;
$$;

/**
 * is_story_list_kind: whether browse_stories() knows a list.
 * As in S1-E5-06, plus 'library' (S1-E4-03). Internal: browse_stories().
 */
create or replace function public.is_story_list_kind(list_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select list_kind in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag',
    'following', 'writer', 'search', 'classics', 'library');
$$;

/**
 * list_default_sort: a list's own order when the reader hasn't picked one.
 * As in S1-E5-04, plus 'library': the stories with the newest chapters first (S1-E4-03).
 * Internal: browse_stories().
 */
create or replace function public.list_default_sort(list_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case list_kind
    when 'new' then 'newest'
    when 'updated' then 'updated'
    when 'following' then 'updated'
    when 'library' then 'updated'
    when 'search' then 'relevance'
    else 'popular'
  end;
$$;

/* ---------- Writes ---------- */

/**
 * readable_chapter_for: a chapter the caller may read, by story address and chapter code.
 * Inputs: story_slug, chapter_code. Returns: the chapter row, or nothing (the same rules as
 *   get_chapter(): rating, blocks, deleted, moderated, unpublished).
 * Internal: save_reading_position(), my_place_in_chapter().
 */
create or replace function public.readable_chapter_for(story_slug text, chapter_code text)
returns setof public.chapters
language sql
stable
security definer
set search_path = ''
as $$
  select chapters.* from public.chapters
  join public.reader_visible_story(story_slug) as story on story.id = chapters.story_id
  where chapters.code = chapter_code and public.chapter_is_readable(chapters.id);
$$;
comment on function public.readable_chapter_for(text, text) is
  'Internal: a chapter the caller may read, by address and code (S1-E4-03).';
revoke execute on function public.readable_chapter_for(text, text) from public, anon, authenticated;

/**
 * finishes_story: whether a place is the end of a completed story: at least 95% through its last
 * readable chapter (the last lines often never reach the top of the screen).
 * Inputs: the chapter and the percent. Returns: true or false.
 * Internal: save_reading_position().
 */
create or replace function public.finishes_story(target_chapter public.chapters, read_percent integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select read_percent >= 95
    and exists (select 1 from public.stories
      where stories.id = target_chapter.story_id and stories.completion_status = 'completed')
    and not exists (select 1 from public.chapters as later
      where later.story_id = target_chapter.story_id and later.position > target_chapter.position
        and public.chapter_is_readable(later.id));
$$;
comment on function public.finishes_story(public.chapters, integer) is
  'Internal: whether a place is the end of a completed story (S1-E4-03).';
revoke execute on function public.finishes_story(public.chapters, integer) from public, anon, authenticated;

/**
 * save_reading_position: keeps the caller's place in a chapter.
 * Inputs: story_slug, chapter_code; read_percent (0 to 100, clamped); device_kind ('phone',
 *   'tablet' or 'computer').
 * Returns: JSON {shelf}: the story's shelf after the save. The story joins "Reading" the first
 *   time the reader saves a place in it, and moves from "Reading" to "Finished" at the end of
 *   the last chapter of a completed story. A story the reader put on another shelf stays there
 *   (finished, or saved for later), except that reading a saved story moves it to "Reading".
 * Errors: insufficient_privilege when signed out; no_data_found when the caller may not read the
 *   chapter; invalid_parameter_value for an unknown device kind.
 * Where it fits: the reader screen, a few seconds after scrolling stops and when the reader
 *   leaves (src/features/reading/hooks/useSavedPlace.ts).
 */
create or replace function public.save_reading_position(
  story_slug text,
  chapter_code text,
  read_percent integer,
  device_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  current_shelf public.library_shelf;
  new_shelf public.library_shelf;
  clamped integer := least(100, greatest(0, coalesce(read_percent, 0)));
begin
  -- Step 1: signed in, and a chapter this reader may read.
  if caller_id is null then
    raise exception 'Log in to keep your place.' using errcode = 'insufficient_privilege';
  end if;
  if device_kind is null or device_kind not in ('phone', 'tablet', 'computer') then
    raise exception 'Unknown kind of device.' using errcode = 'invalid_parameter_value';
  end if;
  select * into chapter from public.readable_chapter_for(story_slug, chapter_code);
  if not found then
    raise exception 'There is no such chapter.' using errcode = 'no_data_found';
  end if;
  -- Step 2: the place, one row per chapter; saving again moves it.
  insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
  values (caller_id, chapter.story_id, chapter.id, clamped, device_kind)
  on conflict on constraint reading_positions_one_per_chapter
  do update set percent = excluded.percent, device_kind = excluded.device_kind, updated_at = now();
  -- Step 3: the shelf. A writer's own story never fills their library.
  if exists (select 1 from public.stories where stories.id = chapter.story_id and stories.user_id = caller_id) then
    return jsonb_build_object('shelf', null);
  end if;
  select library_entries.shelf into current_shelf from public.library_entries
  where library_entries.user_id = caller_id and library_entries.story_id = chapter.story_id;
  new_shelf := case
    when public.finishes_story(chapter, clamped) and coalesce(current_shelf, 'reading') = 'reading' then 'finished'
    when current_shelf is null or current_shelf = 'saved' then 'reading'
    else current_shelf
  end::public.library_shelf;
  if current_shelf is distinct from new_shelf then
    insert into public.library_entries (user_id, story_id, shelf)
    values (caller_id, chapter.story_id, new_shelf)
    on conflict on constraint library_entries_one_per_story do update set shelf = excluded.shelf;
  end if;
  return jsonb_build_object('shelf', new_shelf);
end;
$$;
comment on function public.save_reading_position(text, text, integer, text) is
  'Keeps the caller''s place in a chapter and files the story on a shelf (S1-E4-03).';
revoke execute on function public.save_reading_position(text, text, integer, text) from public, anon;
grant execute on function public.save_reading_position(text, text, integer, text) to authenticated;

/**
 * set_library_shelf: puts a story on one of the caller's shelves, or takes it off.
 * Inputs: story_slug; wanted_shelf ('reading', 'saved', 'finished', or null to remove it).
 * Returns: JSON {shelf}: the shelf now, or null.
 * Rules: removing always works, even for a story the reader can no longer see; adding needs a
 *   story the caller may read with something published. Places in chapters are kept when a
 *   story leaves the library, so putting it back finds the place again.
 * Errors: insufficient_privilege when signed out; no_data_found when the caller may not see the
 *   story.
 * Where it fits: the story page's Library button and the Library page's shelf menu.
 */
create or replace function public.set_library_shelf(story_slug text, wanted_shelf public.library_shelf)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
begin
  -- Step 1: signed in.
  if caller_id is null then
    raise exception 'Log in to keep a library.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: taking a story off works on any story in the library.
  if wanted_shelf is null then
    delete from public.library_entries
    using public.stories
    where stories.id = library_entries.story_id and stories.slug = story_slug
      and library_entries.user_id = caller_id;
    return jsonb_build_object('shelf', null);
  end if;
  -- Step 3: a story the caller may read, with something published.
  select story.id into target_story_id from public.reader_visible_story(story_slug) as story;
  if target_story_id is null or not public.story_has_readable_chapter(target_story_id) then
    raise exception 'There is no such story.' using errcode = 'no_data_found';
  end if;
  -- Step 4: one shelf per story; choosing another moves it.
  insert into public.library_entries (user_id, story_id, shelf)
  values (caller_id, target_story_id, wanted_shelf)
  on conflict on constraint library_entries_one_per_story do update set shelf = excluded.shelf;
  return jsonb_build_object('shelf', wanted_shelf);
end;
$$;
comment on function public.set_library_shelf(text, public.library_shelf) is
  'Puts a story on one of the caller''s library shelves, or takes it off (S1-E4-03).';
revoke execute on function public.set_library_shelf(text, public.library_shelf) from public, anon;
grant execute on function public.set_library_shelf(text, public.library_shelf) to authenticated;

/* ---------- Reads ---------- */

/**
 * my_place_in_chapter: how far the caller got in a chapter, so the reader can offer to go back
 * there.
 * Inputs: story_slug, chapter_code. Returns: JSON {percent, device_kind, saved_at}, or null when
 *   there is no place, the caller is signed out or may not read the chapter.
 * Where it fits: the reader screen (useSavedPlace).
 */
create or replace function public.my_place_in_chapter(story_slug text, chapter_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('percent', positions.percent, 'device_kind', positions.device_kind,
    'saved_at', positions.updated_at)
  from public.readable_chapter_for(story_slug, chapter_code) as chapter
  join public.reading_positions as positions on positions.chapter_id = chapter.id
  where positions.user_id = (select auth.uid());
$$;
comment on function public.my_place_in_chapter(text, text) is
  'How far the caller got in a chapter (S1-E4-03).';
revoke execute on function public.my_place_in_chapter(text, text) from public, anon;
grant execute on function public.my_place_in_chapter(text, text) to authenticated;

/**
 * story_library_state: a story's shelf in the caller's library and their latest place in it.
 * Input: story_slug. Returns: JSON {shelf, place} (place as latest_place_json(), or null), or
 *   null when the caller may not see the story. Signed out: {shelf: null, place: null}.
 * Where it fits: the story page's Library button and "Continue chapter n".
 */
create or replace function public.story_library_state(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'shelf', (select library_entries.shelf from public.library_entries
      where library_entries.user_id = (select auth.uid()) and library_entries.story_id = story.id),
    'place', public.latest_place_json(story.id))
  from public.reader_visible_story(story_slug) as story;
$$;
comment on function public.story_library_state(text) is
  'A story''s shelf in the caller''s library and their latest place in it (S1-E4-03).';
revoke execute on function public.story_library_state(text) from public;
grant execute on function public.story_library_state(text) to anon, authenticated;

/**
 * my_library: the Library page's first answer.
 * Returns: JSON {
 *   counts: {reading, saved, finished}: how many stories each shelf holds that the caller may
 *     still see (rating, blocks, moderation, as every list);
 *   continue_reading: up to 4 stories from "Reading" with a place, most recently read first,
 *     each {story: story_card_json(), place: latest_place_json()};
 *   places: {<story slug>: {number, total}} for every story in the library with a place, for
 *     the cards' "Chapter 14 of 15"
 * }.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: src/features/library/api/library.ts. The shelves themselves come from
 *   browse_stories('library', <shelf>).
 */
create or replace function public.my_library()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  counts jsonb;
  continuing jsonb;
  places jsonb;
begin
  if caller_id is null then
    raise exception 'Log in to see your library.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: each shelf's size, counted as the shelves list them.
  select jsonb_object_agg(shelf_name, (select count(*) from public.listed_stories('library', shelf_name, null, null, null)))
  into counts
  from unnest(array['reading', 'saved', 'finished']) as shelf_name;
  -- Step 2: the stories being read, with the latest place first.
  select coalesce(jsonb_agg(jsonb_build_object('story', public.story_card_json(found.id), 'place', found.place)
      order by found.place ->> 'saved_at' desc), '[]'::jsonb)
  into continuing
  from (
    select with_place.id, with_place.place
    from (
      select listed.id, public.latest_place_json(listed.id) as place
      from public.listed_stories('library', 'reading', null, null, null) as listed
    ) as with_place
    where with_place.place is not null
    order by with_place.place ->> 'saved_at' desc
    limit 4
  ) as found;
  -- Step 3: "Chapter n of N" for every card.
  select coalesce(jsonb_object_agg(found.slug, jsonb_build_object('number', found.place -> 'number', 'total', found.place -> 'total')), '{}'::jsonb)
  into places
  from (
    select stories.slug, public.latest_place_json(stories.id) as place
    from public.library_entries
    join public.stories on stories.id = library_entries.story_id
    where library_entries.user_id = caller_id
  ) as found
  where found.place is not null;
  return jsonb_build_object('counts', counts, 'continue_reading', continuing, 'places', places);
end;
$$;
comment on function public.my_library() is
  'The caller''s library: shelf sizes, the stories to continue and their places (S1-E4-03).';
revoke execute on function public.my_library() from public, anon;
grant execute on function public.my_library() to authenticated;

/**
 * my_follows: the writers and stories the caller follows, for the Library's "What you follow".
 * Returns: JSON {writers: [{handle, display_name, last_published_at}], stories:
 *   [story_card_json()]}, newest activity first. Writers or stories either side blocks, deleted
 *   accounts and stories the caller may not see are left out; never a user ID.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: src/features/library/api/library.ts.
 */
create or replace function public.my_follows()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  writers jsonb;
  followed_stories jsonb;
begin
  if caller_id is null then
    raise exception 'Log in to see who you follow.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the writers, with their latest chapter's date.
  select coalesce(jsonb_agg(jsonb_build_object('handle', found.handle, 'display_name', found.display_name,
      'last_published_at', found.last_published_at) order by found.last_published_at desc nulls last, found.handle), '[]'::jsonb)
  into writers
  from (
    select profiles.handle, public.display_name(profiles.handle, profiles.pen_name) as display_name,
      (select max(stories.last_chapter_published_at) from public.stories
        where stories.user_id = profiles.id and stories.deleted_at is null) as last_published_at
    from public.follows_users
    join public.profiles on profiles.id = follows_users.followed_user_id
    where follows_users.user_id = caller_id and profiles.deleted_at is null and profiles.handle is not null
      and not public.is_blocked_with(profiles.id)
  ) as found;
  -- Step 2: the stories the caller may still see, newest chapter first.
  select coalesce(jsonb_agg(public.story_card_json(stories.id)
      order by stories.last_chapter_published_at desc nulls last, stories.slug), '[]'::jsonb)
  into followed_stories
  from public.follows_stories
  join public.stories on stories.id = follows_stories.story_id
  where follows_stories.user_id = caller_id
    and exists (select 1 from public.reader_visible_story(stories.slug));
  return jsonb_build_object('writers', writers, 'stories', followed_stories);
end;
$$;
comment on function public.my_follows() is
  'The writers and stories the caller follows, for the Library (S1-E4-03).';
revoke execute on function public.my_follows() from public, anon;
grant execute on function public.my_follows() to authenticated;
