/**
 * useLanguagesWrittenIn: the languages a reader's language filter offers: only those at least
 * one story the reader may see is written in, named and sorted in the interface language (story
 * S1-E3-01; Robert, 26 Nov 2026).
 *
 * Who calls it: StoryListFilters (See all), SearchFilterFields (Search) and ReadingLanguagesSection
 * (Settings). What it calls: api/writtenLanguages.ts → story_languages_written_in(), and
 * languageChoices() for the names. The answer depends on who is looking (ratings and blocks), so
 * the cache key carries the session.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/hooks/useSession';
import { languageChoices, type LanguageChoice } from '@/lib/language-names';

import { fetchLanguagesWrittenIn } from '../api/writtenLanguages';

/**
 * The codes a filter lists: the languages written in, plus the ones the reader already chose (a
 * filter in the address, a ticked reading language), so a choice never disappears from its list.
 *
 * @param writtenIn - the languages stories are written in
 * @param alreadyChosen - the codes the reader has chosen
 * @returns each code once
 */
export function filterLanguageCodes(
  writtenIn: readonly string[],
  alreadyChosen: readonly string[],
): string[] {
  return Array.from(new Set([...writtenIn, ...alreadyChosen]));
}

/**
 * Reads the languages stories are written in.
 *
 * @param alreadyChosen - codes to keep in the list whatever the stories (empty by default)
 * @returns the choices (only the chosen ones while loading or when the read failed: the filter
 *   still works) and whether the read failed
 */
export function useLanguagesWrittenIn(alreadyChosen: readonly string[] = []): {
  languages: LanguageChoice[];
  hasFailed: boolean;
} {
  const { i18n } = useTranslation();
  const interfaceLanguage = i18n.resolvedLanguage ?? i18n.language;
  const { userId, isKnown } = useSession();
  const writtenIn = useQuery({
    queryKey: ['story-languages-written-in', userId],
    enabled: isKnown,
    queryFn: fetchLanguagesWrittenIn,
    staleTime: 5 * 60 * 1000,
  });
  // The chosen codes as one string, so a new array with the same codes doesn't sort again.
  const chosenKey = alreadyChosen.join(',');
  const languages = useMemo(() => {
    const codes = filterLanguageCodes(
      writtenIn.data ?? [],
      chosenKey === '' ? [] : chosenKey.split(','),
    );
    return languageChoices(codes, interfaceLanguage);
  }, [writtenIn.data, chosenKey, interfaceLanguage]);
  return { languages, hasFailed: writtenIn.isError };
}
