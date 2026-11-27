/**
 * useStoryFormOptions: the choices the story forms offer: the languages (every language of the
 * world) and the categories (story S1-E3-01).
 *
 * Who calls it: NewStoryPage, StorySettingsPage and the staff story and classic forms;
 * AddLanguageForm uses useWorldLanguageChoices alone. What it calls: src/lib/world-languages.ts
 * with languageChoices() for the languages (Robert, 26 Nov 2026: "the writer can pick the
 * language from an all language list"; until then only the languages staff had opened), and
 * useStoryCategories for the categories. The languages need no database read: their names come
 * from the browser in the interface language. Readers' filters list only the languages stories
 * are written in instead (src/features/discovery/hooks/useLanguagesWrittenIn.ts).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { languageChoices, type LanguageChoice } from '@/lib/language-names';
import { worldLanguageCodes } from '@/lib/world-languages';

import { useStoryCategories } from './useStoryCategories';

/**
 * Every language a story may be written in, named and sorted in the interface language.
 *
 * @returns the choices, worked out again only when the interface language changes
 */
export function useWorldLanguageChoices(): LanguageChoice[] {
  const { i18n } = useTranslation();
  const interfaceLanguage = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => languageChoices(worldLanguageCodes, interfaceLanguage), [interfaceLanguage]);
}

/**
 * Lists the languages and loads the categories.
 *
 * @returns languages, categories, whether the categories have loaded, and whether their read failed
 */
export function useStoryFormOptions() {
  const languages = useWorldLanguageChoices();
  const { categories, isLoaded, loadFailed } = useStoryCategories();
  return { languages, categories, isLoaded, loadFailed };
}
