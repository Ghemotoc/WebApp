/**
 * The reading settings of a signed-out visitor, kept in this browser (BOOKS B04, user story 2.4:
 * "Every setting here is remembered: in the account when signed in, in the browser when signed
 * out").
 *
 * Only the visitor's own choices are kept (paper, typeface, sizes, time left and the comfort
 * settings), under one key in localStorage; nothing is sent anywhere. A value that no longer
 * fits (an old paper name, a broken copy, storage switched off) falls back to the default for
 * that one setting, so a visitor never loses the chapter to a bad copy.
 * Who calls it: hooks/useReadingSettings.ts. What it calls: localStorage. Tested in
 * browserReadingSettings.test.ts.
 */
import { Constants } from '@/lib/database.types';

import { defaultReadingSettings, type ReadingSettings } from '../api/readingSettings';
import { largestTextSize, smallestTextSize } from './readingStyle';

/** The one key the visitor's settings live under. */
export const readingSettingsStorageKey = 'tmc-reading-settings';

/** The database's lists of choices, so a stored value is checked against what can be saved. */
const choices = Constants.public.Enums;

/**
 * Whether a stored value is one of a list's choices.
 *
 * @param list - the allowed values
 * @param value - what was stored
 * @returns true when it is allowed
 */
function isOneOf<Value extends string>(list: readonly Value[], value: unknown): value is Value {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/**
 * A stored text size, or null (follow the device) when it isn't a size the slider offers.
 *
 * @param value - what was stored
 * @returns the size or null
 */
function storedTextSize(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < smallestTextSize || value > largestTextSize) return null;
  return value;
}

/**
 * A stored "HH:MM" time, or null when it isn't one.
 *
 * @param value - what was stored
 * @returns the time or null
 */
function storedTime(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
  return value;
}

/**
 * Checks each stored setting and fills any that doesn't fit with its default.
 *
 * @param stored - what JSON.parse gave back
 * @returns a full, valid set
 */
export function settingsFromStored(stored: Record<string, unknown>): ReadingSettings {
  const base = defaultReadingSettings;
  return {
    font: isOneOf(choices.reading_font, stored.font) ? stored.font : base.font,
    textSize: storedTextSize(stored.textSize),
    lineSpacing: isOneOf(choices.reading_line_spacing, stored.lineSpacing)
      ? stored.lineSpacing
      : base.lineSpacing,
    lineWidth: isOneOf(choices.reading_line_width, stored.lineWidth)
      ? stored.lineWidth
      : base.lineWidth,
    paper: isOneOf(choices.reading_paper, stored.paper) ? stored.paper : base.paper,
    nightByClock: stored.nightByClock === true,
    nightFrom: storedTime(stored.nightFrom),
    nightUntil: storedTime(stored.nightUntil),
    readingRuler: stored.readingRuler === true,
    timeLeft: stored.timeLeft === 'page' ? 'page' : 'bar',
  };
}

/**
 * Reads the visitor's settings from this browser.
 *
 * @returns the stored settings, or the defaults when there are none or they can't be read
 */
export function readBrowserReadingSettings(): ReadingSettings {
  try {
    const text = window.localStorage.getItem(readingSettingsStorageKey);
    if (text === null) return defaultReadingSettings;
    const stored: unknown = JSON.parse(text);
    if (typeof stored !== 'object' || stored === null) return defaultReadingSettings;
    return settingsFromStored(stored as Record<string, unknown>);
  } catch (error) {
    // Storage switched off or a broken copy: the defaults apply, and the reason is logged.
    console.warn('The reading settings kept in this browser could not be read.', error);
    return defaultReadingSettings;
  }
}

/**
 * Keeps the visitor's settings in this browser.
 *
 * @param settings - the whole set, as the panel shows it now
 * @returns true when kept; false when the browser refused (private mode, storage full)
 */
export function storeBrowserReadingSettings(settings: ReadingSettings): boolean {
  try {
    window.localStorage.setItem(readingSettingsStorageKey, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.warn('The reading settings could not be kept in this browser.', error);
    return false;
  }
}
