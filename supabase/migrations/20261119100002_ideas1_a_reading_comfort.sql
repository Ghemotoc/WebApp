/*
 * Migration: reading comfort settings (bundle IDEAS-1, part a; ideas IDEA-20261031-6, 7 and 8,
 * Robert's picks of 31 Oct 2026).
 *
 * What it adds to reading_settings (S1-E4-02):
 * - night_by_clock, night_from and night_until: "Night by the clock". The chapter shows in Night
 *   between two times the reader picks themselves (idea 7: "no fixed or preset hour"), on their
 *   device's own clock. The times stay null until the reader sets them, and nothing changes
 *   until both are set. A span past midnight (22:30 to 06:00) is allowed.
 * - reading_ruler: the soft band that follows the line being read (idea 8).
 * The font (idea 6) is the enum value added in the migration before this one.
 * save_reading_settings() takes the four new values, last and with defaults, so a call with the
 * first five keeps working.
 * Privacy: still the owner's row only (policy reading_settings_select_own); nothing here is
 *   shown to anyone else. Data export and account deletion already cover the table.
 * Who calls it: src/features/reading/api/readingSettings.ts.
 * Tests: supabase/tests/database/215-reading-comfort.test.sql.
 */

alter table public.reading_settings
  add column night_by_clock boolean not null default false,
  add column night_from time,
  add column night_until time,
  add column reading_ruler boolean not null default false;

comment on column public.reading_settings.night_by_clock is
  'Night by the clock: show chapters in Night between night_from and night_until on the device''s clock (IDEA-20261031-7).';
comment on column public.reading_settings.night_from is
  'When Night by the clock starts, as the reader set it; null until set.';
comment on column public.reading_settings.night_until is
  'When Night by the clock ends, as the reader set it; null until set. Earlier than night_from means past midnight.';
comment on column public.reading_settings.reading_ruler is
  'The reading ruler: a soft band over the line being read (IDEA-20261031-8).';

/* ---------- Saving ---------- */

drop function public.save_reading_settings(
  public.reading_font, smallint, public.reading_line_spacing, public.reading_line_width,
  public.reading_theme);

/*
 * save_reading_settings: keeps the caller's reading settings (S1-E4-02; IDEAS-1 part a).
 * Inputs: the font, the text size (null to follow the device), the line spacing, the line width
 *   and the theme; then Night by the clock (on or off), its two times (null until set) and the
 *   reading ruler (on or off). Every value is saved as given, so the panel always sends the set.
 * Returns: nothing.
 * Errors: 42501 when signed out; 23514 (check_violation) for a size outside 14 to 28.
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
  wanted_reading_ruler boolean default false
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
  -- Step 2: one row per reader, replaced as a whole.
  insert into public.reading_settings (user_id, font, text_size, line_spacing, line_width, theme,
    night_by_clock, night_from, night_until, reading_ruler)
  values (caller, wanted_font, wanted_text_size, wanted_line_spacing, wanted_line_width, wanted_theme,
    coalesce(wanted_night_by_clock, false), wanted_night_from, wanted_night_until,
    coalesce(wanted_reading_ruler, false))
  on conflict (user_id) do update
    set font = excluded.font,
        text_size = excluded.text_size,
        line_spacing = excluded.line_spacing,
        line_width = excluded.line_width,
        theme = excluded.theme,
        night_by_clock = excluded.night_by_clock,
        night_from = excluded.night_from,
        night_until = excluded.night_until,
        reading_ruler = excluded.reading_ruler;
end;
$$;
comment on function public.save_reading_settings is
  'Keeps the caller''s reading settings for every device (S1-E4-02; IDEAS-1 part a).';

revoke all on function public.save_reading_settings from public, anon;
grant execute on function public.save_reading_settings to authenticated;
