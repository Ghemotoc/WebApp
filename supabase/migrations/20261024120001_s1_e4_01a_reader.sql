/*
 * Migration: the chapter reader (story S1-E4-01a; board 3.5).
 *
 * What it adds:
 * - get_chapter(story_slug, chapter_code): the one way a reader reaches a chapter's text (ADR
 *   0004). It applies every reading rule in one place: the story is live and not hidden by a
 *   moderator, the reader's age allows the rating (rating_allows(), rule 18), neither side blocks
 *   the other (a stub until S1-E5-05, decided 23 Oct 2026, Q8), and the chapter is published and
 *   not moderated away (chapter_is_readable(), S1-E3-03).
 * - chapter_reads: how many times each chapter was opened each day, as totals only. It never
 *   records who read (architecture 1.6 and 1.7.9: "only aggregated data, never per-reader
 *   records"); S1-E15-02 and the writer dashboard (S1-E3-07) read it.
 * - record_chapter_read(story_slug, chapter_code): adds one to today's total, by the Romanian
 *   date (Q7). The writer's own reads don't count; the browser sends it at most once per chapter
 *   per tab session.
 * - is_blocked_with(other_user_id): a guarded stub that answers false until blocks exist
 *   (S1-E5-05).
 * Who calls it: src/features/reading/api/chapter.ts (the reader screen).
 * Tests: supabase/tests/database/140-get-chapter.test.sql, 141-chapter-reads.test.sql.
 */

/* ---------- Shared contract with the blocks story: is_blocked_with() ---------- */

/**
 * is_blocked_with: does the caller block this person, or does this person block the caller?
 * (S1-E5-05 builds blocks; every reader path asks this already, so blocks work everywhere the
 * day they land; decided 23 Oct 2026, Q8.)
 * Input: other_user_id. Returns: false for everyone in this stub.
 * Guarded: created only when no function of that name exists yet, so the real one is never
 * overwritten, whichever migration lands first. S1-E5-05 replaces it with
 * `create or replace function public.is_blocked_with(uuid)`.
 */
do $$
begin
  if not exists (select 1 from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
                 where pg_namespace.nspname = 'public' and pg_proc.proname = 'is_blocked_with') then
    create function public.is_blocked_with(other_user_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as 'select false';
    comment on function public.is_blocked_with(uuid) is
      'Stub (Lane A, S1-E4-01a): no blocks yet; S1-E5-05 replaces it.';
    revoke execute on function public.is_blocked_with(uuid) from public, anon;
    grant execute on function public.is_blocked_with(uuid) to authenticated;
  end if;
end;
$$;

/* ---------- Daily read totals ---------- */

create table public.chapter_reads (
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- The day in Romania (Q7), so "today" matches the writer's own calendar.
  read_on date not null,
  total integer not null default 0,
  primary key (chapter_id, read_on),
  constraint chapter_reads_total_not_negative check (total >= 0)
);

comment on table public.chapter_reads is
  'kind: platform. How many times each chapter was opened each day: totals only, never who read (S1-E4-01a).';

alter table public.chapter_reads enable row level security;

-- Who: the writer of the chapter. Why: their own reading numbers (the writer dashboard, S1-E3-07);
-- nobody else sees another writer's totals. Writes go only through record_chapter_read().
create policy chapter_reads_select_owner on public.chapter_reads
  for select to authenticated
  using (exists (
    select 1 from public.chapters
    where chapters.id = chapter_reads.chapter_id and chapters.user_id = (select auth.uid())
  ));

grant select on public.chapter_reads to authenticated;

/* ---------- Reading a chapter ---------- */

/**
 * reader_visible_story: the story behind an address, when the caller may read it.
 * Input: story_slug. Returns: the story row, or nothing when it is deleted, hidden by a
 *   moderator, rated above the caller's age or by someone either side blocks. The owner always
 *   gets their own live story, whatever its rating.
 * Internal: shared by get_chapter() and record_chapter_read().
 */
create or replace function public.reader_visible_story(story_slug text)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select stories.* from public.stories
  where stories.slug = story_slug
    and stories.deleted_at is null
    and not public.is_moderated_away('story', stories.id)
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    );
$$;

comment on function public.reader_visible_story(text) is
  'Internal: the story behind an address when the caller may read it (S1-E4-01a).';
revoke execute on function public.reader_visible_story(text) from public, anon, authenticated;

/**
 * get_chapter: one chapter as readers see it (screen 3.5).
 * Inputs: story_slug, chapter_code. Returns: JSON with the story's address, title, language and
 *   writer (pen name or username, never the user ID), the chapter's title, its number among the
 *   readable chapters and how many there are, the previous and next chapters' codes, the first
 *   published and edited dates, the minutes to read (200 words a minute, at least 1; a proposal)
 *   and the published text. A signed-out visitor gets everything but the text, with
 *   needs_sign_in true (the teaser is S1-E4-04). Null when the reader may not see it.
 * Errors: none; an unknown address answers null.
 * Where it fits: the reader screen's only call (src/features/reading/api/chapter.ts).
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
  -- Step 4: the answer; the text only for a signed-in reader.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'slug', story.slug,
      'title', story.title,
      'language_code', story.language_code,
      'writer', (select jsonb_build_object(
          'display_name', public.display_name(profiles.handle, profiles.pen_name),
          'handle', profiles.handle)
        from public.profiles where profiles.id = story.user_id)),
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
    'body', case when caller_id is null then null else chapter.published_body end);
end;
$$;

comment on function public.get_chapter(text, text) is
  'A chapter as readers see it; null when the reader may not (rating, blocks, deleted, moderated, unpublished) (S1-E4-01a).';
revoke execute on function public.get_chapter(text, text) from public;
grant execute on function public.get_chapter(text, text) to anon, authenticated;

/**
 * record_chapter_read: adds one to today's total for a chapter the caller has just opened.
 * Inputs: story_slug, chapter_code. Returns: true when counted; false when the caller may not
 *   read it or is its writer (a writer's own reads don't count).
 * Errors: refuses a signed-out caller (the teaser is not a read).
 * Where it fits: sent once per chapter per tab session by the reader screen; read by the March
 *   numbers (S1-E15-02) and the writer dashboard (S1-E3-07).
 */
create or replace function public.record_chapter_read(story_slug text, chapter_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  read_chapter_id uuid;
begin
  if caller_id is null then
    raise exception 'Sign in to read chapters.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the same rules as get_chapter(); the writer's own reads are left out.
  select * into story from public.reader_visible_story(story_slug);
  if not found or story.user_id = caller_id then
    return false;
  end if;
  select chapters.id into read_chapter_id from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id
    and public.chapter_is_readable(chapters.id);
  if read_chapter_id is null then
    return false;
  end if;
  -- Step 2: one more on today's total (the Romanian date, Q7); nothing about the reader is kept.
  insert into public.chapter_reads (chapter_id, read_on, total)
  values (read_chapter_id, (now() at time zone 'Europe/Bucharest')::date, 1)
  on conflict (chapter_id, read_on) do update set total = public.chapter_reads.total + 1;
  return true;
end;
$$;

comment on function public.record_chapter_read(text, text) is
  'Adds one to today''s read total for a chapter the caller may read; never records who (S1-E4-01a).';
revoke execute on function public.record_chapter_read(text, text) from public, anon;
grant execute on function public.record_chapter_read(text, text) to authenticated;
