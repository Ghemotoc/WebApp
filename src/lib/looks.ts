/**
 * Looks: the colour themes a member can pick (bundle G2 THEMES; handoff doc "Design tokens and
 * themes", section "Themes: members choose their look"; canvas board "Website themes").
 *
 * The rules this file follows:
 * - six year-round themes, Lilac mist by default (Robert, 7 Nov 2026, 11:31: "the website gets the
 *   same themes as the phone app");
 * - no seasonal looks: the four seasonal themes were removed in the flat themes bundle (Robert's
 *   brand answers, 23 Nov 2026), so the look on screen is always the member's own theme;
 * - a look changes only the light colours: night mode is always the monochrome set (NIGHT-1), the same with every
 *   look, and the staff area ignores looks (tokens.css).
 * The member's choice lives on their profile (set_my_appearance) and, so the page can draw the
 * right colours before anything loads, on this device too. public/theme-init.js reads the look
 * from SHOWN_LOOK_STORAGE_KEY before the first paint; keep the key and the attribute the same
 * in both files.
 * Who calls it: src/features/theme/ (the appearance store, the account sync and Settings ›
 * Appearance). What it changes: the data-look attribute on <html>, which picks the colour block in
 * src/styles/tokens.css, and then the phone's bar colour to match (src/lib/browserBarColour.ts,
 * bundle CALM-1).
 */
import { z } from 'zod';

import { matchBrowserBarsToPage } from './browserBarColour';

/** The year-round themes, in the order Settings › Appearance shows them. */
export const yearRoundLooks = ['lilac', 'sorbet', 'seaglass', 'pistachio', 'candy', 'tmc'] as const;

/** One year-round theme. */
export type YearRoundLook = (typeof yearRoundLooks)[number];

/** The default for everyone who hasn't picked (handoff: "Lilac mist is the default"). */
export const defaultLook: YearRoundLook = 'lilac';

/** Where this device remembers the look on screen; public/theme-init.js reads the same key. */
export const SHOWN_LOOK_STORAGE_KEY = 'theme-shown-look';

/** Where this device remembers the member's choice of theme. */
export const LOOK_CHOICE_STORAGE_KEY = 'theme-look-choice';

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
 * Shows a look by setting data-look on <html>, gives the phone's bars the look's page colour
 * (bundle CALM-1), and remembers the look on this device so the next page load draws it before
 * anything else (public/theme-init.js). Storage can be blocked; the look is then still shown, just
 * not remembered.
 *
 * @param look - the look to show
 */
export function applyLook(look: YearRoundLook): void {
  // Step 1: tokens.css reads the attribute and switches the day colours.
  document.documentElement.dataset.look = look;
  // Step 2: the browser's bars take the look's own page colour (bundle CALM-1).
  matchBrowserBarsToPage();
  // Step 3: remember the look for the next page load.
  try {
    window.localStorage.setItem(SHOWN_LOOK_STORAGE_KEY, look);
  } catch {
    // Private windows and strict settings block storage: the look still shows on this page.
  }
}

/** The member's choice as this device remembers it. */
export interface StoredLookChoice {
  look: YearRoundLook;
}

/**
 * The stored choice's shape; anything else falls back to the defaults. A choice saved before the
 * seasonal themes were removed also holds isSeasonalOn; zod leaves that part out, so the member's
 * theme is kept.
 */
const storedLookChoiceSchema = z.object({
  look: z.enum(yearRoundLooks),
});

/**
 * Reads the choice this device remembers.
 *
 * @returns the stored choice, or Lilac mist when none is stored, it is damaged or storage is
 *   blocked
 */
export function readStoredLookChoice(): StoredLookChoice {
  try {
    const stored = window.localStorage.getItem(LOOK_CHOICE_STORAGE_KEY);
    const parsed = storedLookChoiceSchema.safeParse(stored === null ? null : JSON.parse(stored));
    if (parsed.success) return parsed.data;
  } catch {
    // Blocked storage or a damaged value: start from the defaults.
  }
  return { look: defaultLook };
}

/**
 * Remembers the choice on this device.
 *
 * @param choice - the member's theme
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
