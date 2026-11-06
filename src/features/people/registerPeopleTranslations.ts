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
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishPeople from '@/locales/en/people.json';
import romanianPeople from '@/locales/ro/people.json';

const peopleTranslations = createNamespaceTranslations('people', romanianPeople, englishPeople);

/**
 * Registers the people texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerPeopleTranslations = peopleTranslations.register;

/**
 * useTranslation('people'), after making sure the people texts are registered.
 *
 * @returns what useTranslation('people') returns: t and the i18n instance
 */
export const usePeopleTranslation = peopleTranslations.useNamespaceTranslation;
