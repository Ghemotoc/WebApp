/**
 * Runs before every unit and component test (story S1-E1-01).
 *
 * Who loads it: Vitest, through `test.setupFiles` in vite.config.ts.
 * What it adds: the jest-dom matchers (for example `toBeInTheDocument()`), a clean page after
 * each test so one test's screen never leaks into the next, a matchMedia stand-in (S1-E1-03), and
 * the English text up front, so a test can make an English instance at once (the app downloads it
 * only when it is needed; src/lib/i18n-loading.ts).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { registerPreloadedLanguage } from '@/lib/i18n-loading';
import englishAccount from '@/locales/en/account.json';
import englishAds from '@/locales/en/ads.json';
import englishAuth from '@/locales/en/auth.json';
import englishCommon from '@/locales/en/common.json';
import englishLegal from '@/locales/en/legal.json';
import englishLibrary from '@/locales/en/library.json';
import englishPeople from '@/locales/en/people.json';
import englishReading from '@/locales/en/reading.json';
import englishWriting from '@/locales/en/writing.json';

// Tests make English instances straight away (createI18n('en')), so English is here from the start.
registerPreloadedLanguage('en', {
  common: englishCommon,
  legal: englishLegal,
  auth: englishAuth,
  account: englishAccount,
  writing: englishWriting,
  reading: englishReading,
  // The reader's feature namespaces, whose English loads with the eager files (i18n-loading).
  people: englishPeople,
  ads: englishAds,
  library: englishLibrary,
});

afterEach(() => {
  cleanup();
});

// jsdom has no matchMedia; the theme code asks it whether the device is in dark mode.
// This stand-in always answers "light" and ignores listeners.
if (typeof window !== 'undefined' && window.matchMedia === undefined) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
