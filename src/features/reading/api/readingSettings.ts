/**
 * Reads and saves the reader's reading settings (story S1-E4-02; board 3.5 Reader).
 *
 * Who calls it: hooks/useReadingSettings.ts, for the reader's settings panel and the chapter text.
 * What it calls next: the reading_settings table (the caller's own row only, by row-level
 * security) and save_reading_settings() (supabase/migrations/…_s1_e4_02_reading_settings.sql).
 */
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The font choices, generated from the database's enum. */
export type ReadingFont = Database['public']['Enums']['reading_font'];
/** The line spacing choices. */
export type ReadingLineSpacing = Database['public']['Enums']['reading_line_spacing'];
/** The line width choices. */
export type ReadingLineWidth = Database['public']['Enums']['reading_line_width'];
/** The theme choices for the chapter text. */
export type ReadingTheme = Database['public']['Enums']['reading_theme'];

/** One reader's settings. */
export interface ReadingSettings {
  font: ReadingFont;
  /** 14 to 28 px, or null to follow the device's own text size. */
  textSize: number | null;
  lineSpacing: ReadingLineSpacing;
  lineWidth: ReadingLineWidth;
  theme: ReadingTheme;
}

/** What a reader has before choosing anything: the database's defaults. */
export const defaultReadingSettings: ReadingSettings = {
  font: 'sans',
  textSize: null,
  lineSpacing: 'normal',
  lineWidth: 'medium',
  theme: 'light',
};

/**
 * Reads the signed-in reader's settings.
 *
 * @param client - the shared Supabase client
 * @returns the saved settings, or the defaults when the reader has saved none
 * Errors: throws with the database's message when they can't be read.
 */
export async function fetchReadingSettings(client: AppSupabaseClient): Promise<ReadingSettings> {
  const { data, error } = await client
    .from('reading_settings')
    .select('font, text_size, line_spacing, line_width, theme')
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read your reading settings: ${error.message}`);
  if (data === null) return defaultReadingSettings;
  return {
    font: data.font,
    textSize: data.text_size,
    lineSpacing: data.line_spacing,
    lineWidth: data.line_width,
    theme: data.theme,
  };
}

/**
 * Saves the reader's whole set of settings.
 *
 * @param client - the shared Supabase client
 * @param settings - every setting, as the panel shows them now
 * Errors: throws with the database's message when they can't be saved.
 */
export async function saveReadingSettings(
  client: AppSupabaseClient,
  settings: ReadingSettings,
): Promise<void> {
  const { error } = await client.rpc('save_reading_settings', {
    wanted_font: settings.font,
    // The generated type says number, but the function takes null for "follow the device".
    wanted_text_size: settings.textSize as number,
    wanted_line_spacing: settings.lineSpacing,
    wanted_line_width: settings.lineWidth,
    wanted_theme: settings.theme,
  });
  if (error !== null) throw new Error(`Could not save your reading settings: ${error.message}`);
}
