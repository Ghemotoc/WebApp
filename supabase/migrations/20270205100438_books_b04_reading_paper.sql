/*
 * BOOKS B04 (user story 2.4, board B04-ReaderSettings): the reader's Paper replaces the Theme.
 *
 * Reading settings now offer Paper (White, Sepia, Grey, Black; Sepia is today's paper and the
 * default) beside the site's own Night mode switch, instead of the Light, Sepia and Night themes
 * (design files, member pages day v25; colours confirmed by DESIGN, 24 Nov 2026).
 *
 * What it does:
 *   1. A new enum, reading_paper, and reading_settings.paper (default 'sepia').
 *   2. Saved rows move over: Light was today's story paper, which the board now calls Sepia; the
 *      old warm Sepia is closest to the new Sepia too; Night becomes Black.
 *   3. save_reading_settings() takes wanted_paper where it took wanted_theme. Postgres can't change
 *      an argument's type with create or replace, so the function is dropped and made again with
 *      its grants and comment.
 *   4. The theme column and its enum, reading_theme, go: nothing reads them any more.
 * Privacy: paper is the reader's own setting, read only by its owner (policy
 *   reading_settings_select_own). Download my data exports the whole reading_settings row, so the
 *   new column is in it with no change; account deletion already removes the row.
 * Who calls it: src/features/reading/api/readingSettings.ts.
 * Tests: supabase/tests/database/180-reading-settings.test.sql.
 */

/* ---------- 1. The paper ---------- */

create type public.reading_paper as enum ('white', 'sepia', 'grey', 'black');
comment on type public.reading_paper is
  'The colour of the paper the chapter is read on: white, sepia (the story paper, the default), grey or black (BOOKS B04).';

alter table public.reading_settings
  add column paper public.reading_paper not null default 'sepia';
comment on column public.reading_settings.paper is
  'The paper the reader reads on (BOOKS B04, board B04-ReaderSettings). Night mode is the site''s own setting, not this one.';

/* ---------- 2. Saved rows move over ---------- */

-- Night was the dark paper, so it becomes Black; Light and the old Sepia both become Sepia.
update public.reading_settings
  set paper = case when theme = 'night' then 'black'::public.reading_paper
                   else 'sepia'::public.reading_paper end;

/* ---------- 3. Saving it ---------- */

drop function public.save_reading_settings(
  public.reading_font, smallint, public.reading_line_spacing, public.reading_line_width,
  public.reading_theme, boolean, time, time, boolean, text);

/*
 * save_reading_settings: keeps the caller's reading settings (S1-E4-02; IDEAS-1 part a; CALM-5;
 * BOOKS B04).
 * Inputs: the font, the text size (null to follow the device), the line spacing, the line width
 *   and the paper; then Night by the clock (on or off), its two times (null until set), the
 *   reading ruler (on or off) and where the minutes left show ('bar' or 'page'). Every value is
 *   saved as given, so the panel always sends the whole set.
 * Returns: nothing.
 * Errors: 42501 when signed out; 23514 (check_violation) for a size outside 14 to 28 or a
 *   time_left that is neither 'bar' nor 'page'.
 * Flow: the reader's settings panel → this function → reading_settings, read back by the panel's
 *   query on every device.
 */
create function public.save_reading_settings(
  wanted_font public.reading_font,
  wanted_text_size smallint,
  wanted_line_spacing public.reading_line_spacing,
  wanted_line_width public.reading_line_width,
  wanted_paper public.reading_paper,
  wanted_night_by_clock boolean default false,
  wanted_night_from time default null,
  wanted_night_until time default null,
  wanted_reading_ruler boolean default false,
  wanted_time_left text default 'bar'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  -- Step 1: only a signed-in reader has settings to keep.
  if caller is null then
    raise exception 'Log in to save your reading settings.' using errcode = '42501';
  end if;
  -- Step 2: one row per reader, replaced as a whole. A null paper falls back to Sepia, the
  -- default; the column's check refuses any time_left other than 'bar' or 'page'.
  insert into public.reading_settings (user_id, font, text_size, line_spacing, line_width, paper,
    night_by_clock, night_from, night_until, reading_ruler, time_left)
  values (caller, wanted_font, wanted_text_size, wanted_line_spacing, wanted_line_width,
    coalesce(wanted_paper, 'sepia'), coalesce(wanted_night_by_clock, false), wanted_night_from,
    wanted_night_until, coalesce(wanted_reading_ruler, false), coalesce(wanted_time_left, 'bar'))
  on conflict (user_id) do update
    set font = excluded.font,
        text_size = excluded.text_size,
        line_spacing = excluded.line_spacing,
        line_width = excluded.line_width,
        paper = excluded.paper,
        night_by_clock = excluded.night_by_clock,
        night_from = excluded.night_from,
        night_until = excluded.night_until,
        reading_ruler = excluded.reading_ruler,
        time_left = excluded.time_left;
end;
$$;
comment on function public.save_reading_settings is
  'Keeps the caller''s reading settings for every device (S1-E4-02; IDEAS-1 part a; CALM-5 time_left; BOOKS B04 paper).';

revoke all on function public.save_reading_settings from public, anon;
grant execute on function public.save_reading_settings to authenticated;

/* ---------- 4. The old theme goes ---------- */

alter table public.reading_settings drop column theme;
drop type public.reading_theme;
