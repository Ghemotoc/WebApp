/**
 * useReadingLanguages and useReadingLanguageFilter: the story languages someone reads (bundle
 * MARKETS-2, part c; IDEA-20261109-2).
 *
 * The rule (Robert's idea, 9 Nov 2026):
 * - a member who picked languages in Settings › Language › Reading languages reads those;
 * - a member who picked none reads the interface language plus English;
 * - a signed-out visitor reads the language chosen in the language menu, and nothing is stored.
 * Who calls it: ReadingLanguagesSection (Settings) uses useReadingLanguages; useStoryShelf and
 * useStoryList (Discover, Trending, the genre pages and See all) use useReadingLanguageFilter.
 * What it calls next: api/readingLanguages.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import {
  fetchMyReadingLanguages,
  ReadingLanguagesError,
  saveMyReadingLanguages,
  type ReadingLanguagesFailure,
} from '../api/readingLanguages';

/** The cache key of the saved pick; the lists' keys include the languages they used. */
const readingLanguagesQueryKey = 'reading-languages';

/** Every story list's cache key starts with this (useStoryShelf), so a save refreshes them all. */
const storyListQueryKey = 'story-list';

/**
 * The languages read when nothing is picked: the interface language, plus English for a member.
 *
 * @param interfaceLanguage - the language the app is shown in
 * @param isSignedIn - whether someone is signed in
 * @returns the codes, without repeats
 */
export function defaultReadingLanguages(interfaceLanguage: string, isSignedIn: boolean): string[] {
  if (!isSignedIn || interfaceLanguage === 'en') return [interfaceLanguage];
  return [interfaceLanguage, 'en'];
}

/**
 * Reads the signed-in member's saved pick (null for a visitor or while it loads).
 *
 * @returns the query
 */
function useSavedReadingLanguages() {
  const { userId, isKnown } = useSession();
  return useQuery({
    queryKey: [readingLanguagesQueryKey, userId],
    enabled: isKnown && userId !== null,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null || userId === null) return null;
      return fetchMyReadingLanguages(client, userId);
    },
  });
}

/**
 * The languages the story lists show, worked out from the rule above.
 *
 * @returns languages (null until known, so the lists don't load twice) and isDefault
 */
export function useReadingLanguageFilter(): { languages: string[] | null; isDefault: boolean } {
  const { i18n } = useTranslation();
  const { userId, isKnown } = useSession();
  const saved = useSavedReadingLanguages();
  const isSignedIn = userId !== null;
  // Step 1: wait for the session, and for a member's saved pick (a failed read uses the default).
  if (!isKnown || (isSignedIn && saved.isPending)) return { languages: null, isDefault: true };
  // Step 2: the saved pick, or the default.
  const picked = saved.data ?? null;
  if (isSignedIn && picked !== null) return { languages: picked, isDefault: false };
  return { languages: defaultReadingLanguages(i18n.language, isSignedIn), isDefault: true };
}

/**
 * Says why a save failed.
 *
 * @param error - the mutation's error, or null
 * @returns the reason, or null when nothing failed
 */
function failureOf(error: Error | null): ReadingLanguagesFailure | null {
  if (error === null) return null;
  if (error instanceof ReadingLanguagesError) return error.failure;
  return 'unreachable';
}

/**
 * The Settings panel's state: the saved pick and saving a new one.
 *
 * @returns saved (null for the default), isLoaded, loadFailed, save(), isSaving, saveFailure
 */
export function useReadingLanguages() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const saved = useSavedReadingLanguages();
  const save = useMutation({
    mutationFn: async (codes: string[]) => {
      const client = await getSupabaseClient();
      if (client === null) throw new ReadingLanguagesError('unreachable');
      return saveMyReadingLanguages(client, codes);
    },
    onSuccess: async (result) => {
      // The new pick, then every story list again, so Discover follows straight away.
      queryClient.setQueryData([readingLanguagesQueryKey, userId], result);
      await queryClient.invalidateQueries({ queryKey: [storyListQueryKey] });
    },
  });
  return {
    saved: saved.data ?? null,
    isLoaded: saved.isSuccess,
    loadFailed: saved.isError,
    save: (codes: string[]) => save.mutateAsync(codes),
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    saveFailure: failureOf(save.error),
  };
}
