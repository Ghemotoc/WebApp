/**
 * The language a reader chose for a story, kept in this browser (bundle TRANSLATE-1b; handoff:
 * "the reader's choice is remembered per story").
 *
 * Who calls it: components/ReadInSwitch.tsx (saves the choice when a language is picked) and
 * hooks/useOpeningEdition.ts (reads it before asking the database which edition to open).
 * Storage: this browser only (localStorage), one small entry per story the reader switched
 * language on, keyed by the first edition's address. Nothing is sent anywhere, and a story's
 * address is not personal data. Storage can be blocked (private windows), so every read and
 * write is wrapped: the choice then lasts only for the click itself.
 */

/** The localStorage key holding every remembered choice, as one small JSON object. */
export const REMEMBERED_EDITIONS_KEY = 'story-reading-language';

/** The most stories remembered; the oldest choice is dropped first. */
const rememberedMax = 200;

/** Reads the stored object; empty when nothing valid is stored. */
function readChoices(): Record<string, string> {
  try {
    const stored = window.localStorage.getItem(REMEMBERED_EDITIONS_KEY);
    if (stored === null) return {};
    const parsed: unknown = JSON.parse(stored);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * The language chosen for a story in this browser.
 *
 * @param firstEditionSlug - the address of the story's first edition
 * @returns the language code, or null when the reader never chose one for this story
 */
export function readRememberedEdition(firstEditionSlug: string): string | null {
  const language = readChoices()[firstEditionSlug];
  return typeof language === 'string' ? language : null;
}

/**
 * Keeps the language a reader picked for a story.
 *
 * @param firstEditionSlug - the address of the story's first edition
 * @param languageCode - the language picked in the "Read in" switch
 * @returns true when it was saved; false when storage is unavailable
 */
export function saveRememberedEdition(firstEditionSlug: string, languageCode: string): boolean {
  try {
    // Step 1: the newest choice goes last, so the oldest ones come first.
    const earlier = Object.entries(readChoices()).filter(([slug]) => slug !== firstEditionSlug);
    const choices = [...earlier, [firstEditionSlug, languageCode] as const];
    // Step 2: keep the list short by dropping the oldest.
    const kept = choices.slice(Math.max(0, choices.length - rememberedMax));
    window.localStorage.setItem(REMEMBERED_EDITIONS_KEY, JSON.stringify(Object.fromEntries(kept)));
    return true;
  } catch {
    return false;
  }
}
