/*
 * CALM-5: the reader in the simplified design (design handover "Build: handover for the
 * simplified design", Step 4, "Comments on a paragraph, reading settings and time left" point 9
 * and "Adverts in the reader" point 2; Robert, 20 Nov 2026).
 *
 * What it does:
 *   1. reading_settings.time_left: where the minutes left in a chapter show. 'bar' (the default)
 *      puts them at the end of the chapter bar's meta line ("Chapter 14 of 15 · 3 min left");
 *      'page' keeps the small floating pill at the foot of the window instead (Robert, 20 Nov
 *      2026, 12:28 UTC: nothing changes for a reader until they pick On the page).
 *   2. save_reading_settings() takes it as its last argument, wanted_time_left, with the same
 *      default, so every older call keeps working. Postgres can't add an argument with
 *      create or replace, so the function is dropped and made again with its grants and comment.
 *   3. The reader's second advert slot, chapter_side (page chapter, position 2, a 300 × 250 side
 *      box): in the side column under About this story from 1280 px, under the chapter's comments
 *      below that. page_ads() fills it with the same rules as every slot: signed-in readers only,
 *      none in class spaces or on class-only stories, no network advert where the rating reasons
 *      bar one, never the same advert twice on a page.
 *   4. reading_settings.font defaults to the serif (Literata), the font the new paper is drawn in.
 * Privacy: time_left is the reader's own setting, read only by its owner (policy
 *   reading_settings_select_own). Download my data exports the whole reading_settings row, so the
 *   new column is in it with no change; account deletion already removes the row.
 * Who calls it: src/features/reading/api/readingSettings.ts (the setting) and
 *   src/features/ads/components/PageAdSlot.tsx through page_ads() (the slot).
 * Tests: supabase/tests/database/180-reading-settings.test.sql and 270-ad-slots.test.sql.
 */

/* ---------- 1. Where the minutes left show ---------- */

alter table public.reading_settings
  add column time_left text not null default 'bar'
    constraint reading_settings_time_left_choice check (time_left in ('bar', 'page'));

comment on column public.reading_settings.time_left is
  'Where the minutes left in a chapter show: bar (the chapter bar''s meta line, the default) or page (the floating pill at the foot). CALM-5; Robert, 20 Nov 2026, 12:28 UTC.';

/* ---------- 2. Saving it ---------- */

drop function public.save_reading_settings(
  public.reading_font, smallint, public.reading_line_spacing, public.reading_line_width,
  public.reading_theme, boolean, time, time, boolean);

/*
 * save_reading_settings: keeps the caller's reading settings (S1-E4-02; IDEAS-1 part a; CALM-5).
 * Inputs: the font, the text size (null to follow the device), the line spacing, the line width
 *   and the theme; then Night by the clock (on or off), its two times (null until set), the
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
  wanted_theme public.reading_theme,
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
  -- Step 2: one row per reader, replaced as a whole. The column's check refuses any time_left
  -- other than 'bar' or 'page'; a null falls back to the default 'bar'.
  insert into public.reading_settings (user_id, font, text_size, line_spacing, line_width, theme,
    night_by_clock, night_from, night_until, reading_ruler, time_left)
  values (caller, wanted_font, wanted_text_size, wanted_line_spacing, wanted_line_width, wanted_theme,
    coalesce(wanted_night_by_clock, false), wanted_night_from, wanted_night_until,
    coalesce(wanted_reading_ruler, false), coalesce(wanted_time_left, 'bar'))
  on conflict (user_id) do update
    set font = excluded.font,
        text_size = excluded.text_size,
        line_spacing = excluded.line_spacing,
        line_width = excluded.line_width,
        theme = excluded.theme,
        night_by_clock = excluded.night_by_clock,
        night_from = excluded.night_from,
        night_until = excluded.night_until,
        reading_ruler = excluded.reading_ruler,
        time_left = excluded.time_left;
end;
$$;
comment on function public.save_reading_settings is
  'Keeps the caller''s reading settings for every device (S1-E4-02; IDEAS-1 part a; CALM-5 time_left).';

revoke all on function public.save_reading_settings from public, anon;
grant execute on function public.save_reading_settings to authenticated;

/* ---------- 3. The reader's side box ---------- */

-- Still at most two slots a page (decided 17 Oct 2026): chapter_end (position 1, the 728 × 90
-- banner under the chapter navigation) and this one (position 2).
insert into public.ad_slots (slot_key, page_key, position, format) values
  ('chapter_side', 'chapter', 2, 'side_box');

/* ---------- 4. Literata first ---------- */

-- The simplified design draws the reader's paper in Literata (handover Step 3, the reader), so a
-- reader who saves settings for the first time without touching Font keeps the serif. Rows
-- already saved keep the font they hold.
alter table public.reading_settings alter column font set default 'serif';
