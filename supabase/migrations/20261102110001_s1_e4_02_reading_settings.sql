/*
 * Migration: the reader's reading settings (story S1-E4-02; board 3.5 Reader, "Reading settings").
 *
 * What it adds:
 * - Four enums for the choices the board offers: the font (our sans, a serif and a
 *   dyslexia-friendly one), the line spacing, the line width and the theme (light, sepia, night).
 * - reading_settings: one row per reader with their choices. The text size is null until the
 *   reader picks one, so the reader screen starts from the device's own text size (S1-E4-02,
 *   third criterion).
 * - save_reading_settings(): the reader screen saves every change here, so the settings follow
 *   the reader to every device they log in on (second criterion).
 * Privacy: how someone likes to read is personal data of a mild kind (a dyslexia-friendly font can
 *   hint at a need), so the row is readable by its owner only and never shown to anyone else.
 *   Saving needs no account gate: it changes nothing anyone else sees.
 * Who calls it: src/features/reading/api/readingSettings.ts (the reader's settings panel).
 * Tests: supabase/tests/database/180-reading-settings.test.sql.
 */

/* ---------- Choices ---------- */

create type public.reading_font as enum ('sans', 'serif', 'dyslexia_friendly');
comment on type public.reading_font is
  'The reader''s font: the app''s sans (Inter), a serif, or a dyslexia-friendly one (S1-E4-02).';
create type public.reading_line_spacing as enum ('compact', 'normal', 'wide');
comment on type public.reading_line_spacing is
  'The reader''s line spacing: 1.5, 1.7 or 2 (S1-E4-02; board 3.5).';
create type public.reading_line_width as enum ('narrow', 'medium', 'wide');
comment on type public.reading_line_width is
  'The reader''s line width: about 560, 680 or 780 px (S1-E4-02; board 3.5).';
create type public.reading_theme as enum ('light', 'sepia', 'night');
comment on type public.reading_theme is
  'The reader''s theme for the chapter text: light (the app''s colours), sepia or night (S1-E4-02).';

/* ---------- Table ---------- */

create table public.reading_settings (
  id uuid primary key default gen_random_uuid(),
  -- The reader (CLAUDE.md rule 15); one row each.
  user_id uuid not null unique references public.profiles (id),
  font public.reading_font not null default 'sans',
  -- Null: follow the device's own text size. Otherwise 14 to 28 px, the board's slider.
  text_size smallint check (text_size between 14 and 28),
  line_spacing public.reading_line_spacing not null default 'normal',
  line_width public.reading_line_width not null default 'medium',
  theme public.reading_theme not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.reading_settings is
  'kind: user_action
A reader''s font, text size, line spacing, line width and theme for chapters (S1-E4-02). Private.';
create trigger reading_settings_set_updated_at
  before update on public.reading_settings
  for each row execute function public.set_updated_at();
alter table public.reading_settings enable row level security;

-- Who: the reader. Why: their own settings, read on every device they log in on (S1-E4-02);
-- nobody else needs to know how someone reads. Writes go only through save_reading_settings().
create policy reading_settings_select_own on public.reading_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.reading_settings to authenticated;

/* ---------- Saving ---------- */

/*
 * save_reading_settings: keeps the caller's reading settings (S1-E4-02, second criterion).
 * Inputs: the font, the text size (null to follow the device), the line spacing, the line width
 *   and the theme. Every value is saved as given, so the panel always sends the whole set.
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
  wanted_theme public.reading_theme
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  -- Step 1: only a signed-in reader has settings to save.
  if caller is null then
    raise exception 'Log in to save your reading settings.' using errcode = '42501';
  end if;
  -- Step 2: one row per reader, created the first time and replaced after that.
  insert into public.reading_settings (user_id, font, text_size, line_spacing, line_width, theme)
  values (caller, wanted_font, wanted_text_size, wanted_line_spacing, wanted_line_width, wanted_theme)
  on conflict (user_id) do update
    set font = excluded.font,
        text_size = excluded.text_size,
        line_spacing = excluded.line_spacing,
        line_width = excluded.line_width,
        theme = excluded.theme;
end;
$$;
comment on function public.save_reading_settings is
  'Keeps the caller''s reading settings for every device (S1-E4-02).';

revoke all on function public.save_reading_settings from public, anon;
grant execute on function public.save_reading_settings to authenticated;
