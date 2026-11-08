/**
 * Looks: the colour themes a member can pick, and the seasonal looks that switch on by themselves
 * (bundle G2 THEMES; handoff doc "Design tokens and themes", section "Themes: members choose their
 * look"; canvas board "Website themes").
 *
 * The rules this file follows:
 * - six year-round themes, Lilac mist by default (Robert, 7 Nov 2026, 11:31: "the website gets the
 *   same themes as the phone app");
 * - four seasonal looks, each shown in its own weeks, only for members who turned Seasonal themes
 *   on (off by default); the weeks are the public setting seasonal_look_dates;
 * - a look changes only the light colours: night mode is always Revolver, the same with every
 *   look, and the staff area ignores looks (tokens.css).
 * The member's choice lives on their profile (set_my_appearance) and, so the page can draw the
 * right colours before anything loads, on this device too. public/theme-init.js reads the shown
 * look from SHOWN_LOOK_STORAGE_KEY before the first paint; keep the key and the attribute the same
 * in both files.
 * Who calls it: src/features/theme/ (the appearance store, the account sync and Settings ›
 * Appearance). What it changes: the data-look attribute on <html>, which picks the colour block in
 * src/styles/tokens.css.
 */
import { z } from 'zod';

/** The year-round themes, in the order Settings › Appearance shows them. */
export const yearRoundLooks = ['lilac', 'sorbet', 'seaglass', 'pistachio', 'candy', 'tmc'] as const;

/** One year-round theme. */
export type YearRoundLook = (typeof yearRoundLooks)[number];

/** The seasonal looks, in calendar order. */
export const seasonalLooks = ['winter', 'spring', 'summer', 'autumn'] as const;

/** One seasonal look. */
export type SeasonalLook = (typeof seasonalLooks)[number];

/** What the page can show: a year-round theme or a seasonal look. */
export type ShownLook = YearRoundLook | SeasonalLook;

/** The default for everyone who hasn't picked (handoff: "Lilac mist is the default"). */
export const defaultLook: YearRoundLook = 'lilac';

/** Where this device remembers the look on screen; public/theme-init.js reads the same key. */
export const SHOWN_LOOK_STORAGE_KEY = 'theme-shown-look';

/** Where this device remembers the member's choice: the year-round look and the seasonal switch. */
export const LOOK_CHOICE_STORAGE_KEY = 'theme-look-choice';

/** One seasonal window: the look and its first and last day as month-day ("01-08"). */
export interface SeasonalWindow {
  look: SeasonalLook;
  from: string;
  to: string;
}

/**
 * The decided windows (canvas "Website themes", 7 Nov 2026), used while the setting loads or if
 * it can't be read. Winter starts on 8 January, after the festive weeks.
 */
export const decidedSeasonalWindows: readonly SeasonalWindow[] = [
  { look: 'winter', from: '01-08', to: '02-29' },
  { look: 'spring', from: '03-01', to: '05-31' },
  { look: 'summer', from: '06-01', to: '08-31' },
  { look: 'autumn', from: '09-01', to: '11-30' },
];

/** A month-day such as "01-08": two digits, a hyphen, two digits. */
const monthDay = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);

/** The shape of the seasonal_look_dates setting. */
const seasonalWindowsSchema = z.array(
  z.object({ look: z.enum(seasonalLooks), from: monthDay, to: monthDay }),
);

/**
 * Says whether a value is one of the year-round themes.
 *
 * @param value - anything, for example a stored value
 * @returns true for 'lilac', 'sorbet', 'seaglass', 'pistachio', 'candy' or 'tmc'
 */
export function isYearRoundLook(value: unknown): value is YearRoundLook {
  return yearRoundLooks.includes(value as YearRoundLook);
}

/**
 * Says whether a value is a look the page can show.
 *
 * @param value - anything
 * @returns true for a year-round theme or a seasonal look
 */
export function isShownLook(value: unknown): value is ShownLook {
  return isYearRoundLook(value) || seasonalLooks.includes(value as SeasonalLook);
}

/**
 * Reads the seasonal_look_dates setting, or null when it isn't the expected shape (the caller
 * then uses decidedSeasonalWindows).
 *
 * @param value - the setting's value as the database sent it
 * @returns the windows, or null
 */
export function parseSeasonalWindows(value: unknown): SeasonalWindow[] | null {
  const parsed = seasonalWindowsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * A date's month-day in this device's time zone, to compare with the windows.
 *
 * @param date - the day to check
 * @returns for example "03-15"
 */
function monthDayOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

/**
 * Says whether a month-day falls inside a window, first and last day included. A window whose
 * start comes after its end (for example 12-15 to 01-06) crosses the new year.
 *
 * @returns true inside the window
 */
function isInsideWindow(day: string, window: SeasonalWindow): boolean {
  if (window.from <= window.to) return day >= window.from && day <= window.to;
  return day >= window.from || day <= window.to;
}

/**
 * The seasonal look whose weeks include a date, if any.
 *
 * @param date - the day to check (today, in practice)
 * @param windows - the windows from the setting, or the decided ones
 * @returns the seasonal look, or null between seasons
 */
export function seasonalLookOn(
  date: Date,
  windows: readonly SeasonalWindow[],
): SeasonalLook | null {
  const day = monthDayOf(date);
  const window = windows.find((candidate) => isInsideWindow(day, candidate));
  return window?.look ?? null;
}

/**
 * The look to show: the season's look when the member turned seasonal themes on and a season is
 * running, otherwise their year-round theme.
 *
 * @param look - the member's year-round theme
 * @param isSeasonalOn - the Seasonal themes switch
 * @param date - today
 * @param windows - the seasonal windows
 * @returns the look for data-look
 */
export function shownLookFor(
  look: YearRoundLook,
  isSeasonalOn: boolean,
  date: Date,
  windows: readonly SeasonalWindow[],
): ShownLook {
  if (!isSeasonalOn) return look;
  return seasonalLookOn(date, windows) ?? look;
}

/**
 * Shows a look by setting data-look on <html>, and remembers it on this device so the next page
 * load draws it before anything else (public/theme-init.js). Storage can be blocked; the look is
 * then still shown, just not remembered.
 *
 * @param look - the look to show
 */
export function applyLook(look: ShownLook): void {
  document.documentElement.dataset.look = look;
  try {
    window.localStorage.setItem(SHOWN_LOOK_STORAGE_KEY, look);
  } catch {
    // Private windows and strict settings block storage: the look still shows on this page.
  }
}

/** The member's choice as this device remembers it. */
export interface StoredLookChoice {
  look: YearRoundLook;
  isSeasonalOn: boolean;
}

/** The stored choice's shape; anything else falls back to the defaults. */
const storedLookChoiceSchema = z.object({
  look: z.enum(yearRoundLooks),
  isSeasonalOn: z.boolean(),
});

/**
 * Reads the choice this device remembers.
 *
 * @returns the stored choice, or Lilac mist with seasonal themes off when none is stored, it is
 *   damaged or storage is blocked
 */
export function readStoredLookChoice(): StoredLookChoice {
  try {
    const stored = window.localStorage.getItem(LOOK_CHOICE_STORAGE_KEY);
    const parsed = storedLookChoiceSchema.safeParse(stored === null ? null : JSON.parse(stored));
    if (parsed.success) return parsed.data;
  } catch {
    // Blocked storage or a damaged value: start from the defaults.
  }
  return { look: defaultLook, isSeasonalOn: false };
}

/**
 * Remembers the choice on this device.
 *
 * @param choice - the year-round look and the seasonal switch
 * @returns true when it was saved; false when storage is unavailable (the choice then lasts until
 *   the page closes; for a signed-in member it is on the account anyway)
 */
export function saveStoredLookChoice(choice: StoredLookChoice): boolean {
  try {
    window.localStorage.setItem(LOOK_CHOICE_STORAGE_KEY, JSON.stringify(choice));
    return true;
  } catch {
    return false;
  }
}
