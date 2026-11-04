/*
 * Migration: the read-through rate counts the furthest place (bundle IDEAS-2, part d; idea
 * IDEA-20261101-9, approved by Robert on 2 Nov 2026, 22:00).
 *
 * reading_positions keeps one row per reader and chapter, and its percent is the reader's latest
 * place, so the "Continue reading" link takes them back to where they were. The dashboard counted
 * a reader as finished only while that latest place was at 95% or more, so a reader who reached
 * the end and then scrolled back to a favourite scene stopped counting. A second number,
 * furthest_percent, keeps the furthest place the reader ever reached in the chapter; a trigger
 * moves it on whenever the place is saved, so save_reading_position() needs no change.
 * - writer_chapter_numbers() counts finished readers by furthest_percent (criterion 1);
 * - writer_reader_stops() ("Where readers stop") uses it too, so both numbers tell the same story;
 * - "fewer than 5" is unchanged: read_through_percent() still returns null below five readers
 *   (criterion 2).
 * No new personal data: it is the same reading place, kept a little longer within the same row,
 * and it goes in Download my data and is deleted with the row as before.
 * Who calls it: the reader screen through save_reading_position(); the writer dashboard and its
 *   chapter insights read the numbers.
 * Tests: supabase/tests/database/282-furthest-place.test.sql.
 */

alter table public.reading_positions
  add column furthest_percent smallint not null default 0 check (furthest_percent between 0 and 100);
comment on column public.reading_positions.furthest_percent is
  'The furthest place the reader ever reached in the chapter, 0 to 100; never goes back (IDEAS-2 idea 9).';

-- Existing rows only know their latest place, which is the best guess of how far they got.
update public.reading_positions set furthest_percent = percent;

/**
 * keep_furthest_reading_place: moves furthest_percent on when a reader's place is saved.
 * Inputs: the row being written (trigger). Returns: the row with furthest_percent at least its
 *   percent and, on an update, at least the old furthest place, so it never goes back.
 * Where it fits: before every insert or update on reading_positions, which only
 *   save_reading_position() writes.
 */
create or replace function public.keep_furthest_reading_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Step 1: never behind the place being saved now.
  new.furthest_percent := greatest(new.furthest_percent, new.percent);
  -- Step 2: on a later save, never behind what the reader reached before.
  if tg_op = 'UPDATE' then
    new.furthest_percent := greatest(new.furthest_percent, old.furthest_percent);
  end if;
  return new;
end;
$$;
comment on function public.keep_furthest_reading_place() is
  'Trigger: keeps reading_positions.furthest_percent at the furthest place reached (IDEAS-2d).';
revoke execute on function public.keep_furthest_reading_place() from public, anon, authenticated;

create trigger reading_positions_keep_furthest
  before insert or update on public.reading_positions
  for each row execute function public.keep_furthest_reading_place();

/**
 * writer_chapter_numbers: raw totals for each live chapter of a writer's live stories.
 * Inputs: writer_id; since (count only what happened from then on; null for all time).
 * Returns: one row per chapter: chapter_id, reads (chapter openings), readers and finished (signed-
 *   in readers with a saved place, and those whose furthest place is 95% or more, so a reader who
 *   reached the end and scrolled back up still counts as finished; IDEA-20261101-9), likes, comments (by other people, shown
 *   to the writer) and shares. The writer's own reads, places, likes and comments never count.
 * Internal: writer_dashboard(); the raw numbers never leave the database unrounded.
 */
create or replace function public.writer_chapter_numbers(writer_id uuid, since timestamptz)
returns table (chapter_id uuid, reads numeric, readers bigint, finished bigint, likes bigint,
  comments bigint, shares numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with writer_chapters as (
    select chapters.id from public.chapters
    join public.stories on stories.id = chapters.story_id
    where stories.user_id = writer_id and stories.deleted_at is null and chapters.deleted_at is null
  ),
  since_day as (
    -- The day totals are kept by Romanian date (Q7), so "since" is a Romanian day too.
    select (since at time zone 'Europe/Bucharest')::date as first_day
  )
  select writer_chapters.id,
    (select coalesce(sum(chapter_reads.total), 0) from public.chapter_reads, since_day
      where chapter_reads.chapter_id = writer_chapters.id
        and (since is null or chapter_reads.read_on >= since_day.first_day)),
    (select count(*) from public.reading_positions
      where reading_positions.chapter_id = writer_chapters.id and reading_positions.user_id <> writer_id
        and (since is null or reading_positions.updated_at >= since)),
    (select count(*) from public.reading_positions
      where reading_positions.chapter_id = writer_chapters.id and reading_positions.user_id <> writer_id
        and reading_positions.furthest_percent >= 95
        and (since is null or reading_positions.updated_at >= since)),
    (select count(*) from public.chapter_likes
      where chapter_likes.chapter_id = writer_chapters.id and chapter_likes.user_id <> writer_id
        and (since is null or chapter_likes.created_at >= since)),
    (select count(*) from public.comments
      where comments.chapter_id = writer_chapters.id and comments.user_id <> writer_id
        and public.comment_is_shown_to_caller(comments)
        and (since is null or comments.created_at >= since)),
    (select coalesce(sum(chapter_shares.total), 0) from public.chapter_shares, since_day
      where chapter_shares.chapter_id = writer_chapters.id
        and (since is null or chapter_shares.shared_on >= since_day.first_day))
  from writer_chapters;
$$;
comment on function public.writer_chapter_numbers(uuid, timestamptz) is
  'Internal: raw totals per chapter for the writer dashboard; finished counts the furthest place (S1-E3-07, IDEAS-2d).';
revoke execute on function public.writer_chapter_numbers(uuid, timestamptz) from public, anon, authenticated;

/**
 * writer_reader_stops: where readers' saved places sit in a chapter, in tenths (idea
 *   IDEA-20261031-5).
 * Inputs: the chapter and its writer. Returns: JSON {readers, tenths}: readers through
 *   shown_count(); tenths is ten whole percentages (0 to 10 %, 10 to 20 % … 90 to 100 %, the end
 *   counted in the last), or null below five readers, so no bar can point to one reader. Each
 *   reader counts once, at the furthest place they reached (IDEA-20261101-9); the writer's own place never counts.
 * Internal: writer_chapter_insights().
 */
create or replace function public.writer_reader_stops(target_chapter_id uuid, writer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with places as (
    select least(reading_positions.furthest_percent / 10, 9) as tenth
    from public.reading_positions
    where reading_positions.chapter_id = target_chapter_id and reading_positions.user_id <> writer_id
  ),
  totals as (select count(*) as readers from places)
  select jsonb_build_object(
    'readers', public.shown_count(totals.readers),
    'tenths', case when totals.readers < 5 then null else (
      select jsonb_agg(round(100.0 * (select count(*) from places where places.tenth = slot) / totals.readers)::integer
        order by slot)
      from generate_series(0, 9) as slot) end)
  from totals;
$$;
comment on function public.writer_reader_stops(uuid, uuid) is
  'Internal: how far readers got in a chapter, in tenths, only from five readers (IDEAS-1d, IDEAS-2d).';
revoke execute on function public.writer_reader_stops(uuid, uuid) from public, anon, authenticated;
