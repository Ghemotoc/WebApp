/**
 * Adds the profile, follow and block text (the "people" namespace) to the translations when a
 * people component first renders (stories S1-E5-05 and S1-E6-05).
 *
 * Why not with the rest: the text is only needed on the profile, the story page's writer card and
 * Settings, so it travels with those components instead of the first download every page makes.
 * Keeping it out of the main bundle keeps the chapter reader inside its 2-second budget
 * (e2e/reader-performance.spec.ts, S1-E4-01b). Same pattern as the reporting and staff texts.
 * Who calls it: every component in src/features/people/components and the two Settings sections,
 * through usePeopleTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishPeople from '@/locales/en/people.json';
import romanianPeople from '@/locales/ro/people.json';

/**
 * Registers the people texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerPeopleTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'people')) return;
  i18n.addResourceBundle('ro', 'people', romanianPeople);
  i18n.addResourceBundle('en', 'people', englishPeople);
}

/**
 * useTranslation('people'), after making sure the people texts are registered.
 *
 * @returns what useTranslation('people') returns: t and the i18n instance
 */
export function usePeopleTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the people texts to it the first time any people component renders.
  registerPeopleTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "people" namespace.
  return useTranslation('people');
}
