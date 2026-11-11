/**
 * The interface language this browser last chose (story S1-E1-04).
 *
 * The rule, in order (decided 17 Oct 2026, 11:48; S1-E1-04 acceptance criteria):
 *   1. a signed-in person's account language (profiles.locale) wins, on every device;
 *   2. otherwise the language chosen in this browser, kept here;
 *   3. otherwise the language for the connection's country, on a first visit (MARKETS-2a,
 *      src/features/language/lib/firstVisitLanguage.ts);
 *   4. otherwise Romanian. The browser's own language is never read.
 * This file is step 2. Step 1 is src/features/language/hooks/useAccountLanguage.ts.
 *
 * Who calls it: src/main.tsx (to start in the right language before the first paint) and the
 * language hooks in src/features/language/hooks/.
 * Storage: this browser only (localStorage). Storage can be blocked (private windows, strict
 * settings), so every read and write is wrapped and fails quietly to the safe default.
 */
import { defaultLanguage, isSupportedLanguage, type SupportedLanguage } from './i18n';

/** The localStorage key for the language chosen in this browser. */
export const LANGUAGE_STORAGE_KEY = 'interface-language';

/**
 * Reads the language chosen in this browser.
 *
 * @returns the saved language, or Romanian when nothing valid is saved or storage is unavailable
 */
export function readDeviceLanguage(): SupportedLanguage {
  try {
    const storedValue = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(storedValue) ? storedValue : defaultLanguage;
  } catch {
    return defaultLanguage;
  }
}

/**
 * Says whether this browser holds a language choice at all (bundle MARKETS-2, part a): the
 * first-visit hint from the country (useFirstVisitLanguage) runs only while it doesn't.
 *
 * @returns true when a valid language is saved; false when none is, or storage is unavailable
 */
export function hasDeviceLanguage(): boolean {
  try {
    return isSupportedLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return false;
  }
}

/**
 * Keeps the language in this browser, so the next visit opens in it even when signed out.
 *
 * @param language - the language just chosen
 * @returns true when it was saved; false when storage is unavailable (the choice then lasts only
 *   until the page is closed; nothing else breaks)
 */
export function saveDeviceLanguage(language: SupportedLanguage): boolean {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    return true;
  } catch {
    return false;
  }
}
