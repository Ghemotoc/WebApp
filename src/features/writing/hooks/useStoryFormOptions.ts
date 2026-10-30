/**
 * useStoryFormOptions: the choices the new story form offers: languages (open or coming) and
 * categories (story S1-E3-01).
 *
 * Who calls it: NewStoryPage and StorySettingsPage. What it calls: api/stories.ts
 * (story_language_choices() and the categories table). Staff change both on Staff › Settings
 * (S1-E11-03, S1-E11-05), so they are read again after five minutes.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchCategories,
  fetchStoryLanguages,
  type StoryCategory,
  type StoryLanguageChoice,
} from '../api/stories';

/** How long the choices stay fresh: staff rarely change them. */
const choicesFreshMilliseconds = 5 * 60 * 1000;

/**
 * Loads the languages and categories.
 *
 * @returns languages, categories, whether both have loaded, and whether a read failed
 */
export function useStoryFormOptions() {
  const languages = useQuery<StoryLanguageChoice[]>({
    queryKey: ['story-languages'],
    staleTime: choicesFreshMilliseconds,
    queryFn: async () => fetchStoryLanguages(await requireClient()),
  });
  const categories = useQuery<StoryCategory[]>({
    queryKey: ['story-categories'],
    staleTime: choicesFreshMilliseconds,
    queryFn: async () => fetchCategories(await requireClient()),
  });
  return {
    languages: languages.data ?? [],
    categories: categories.data ?? [],
    isLoaded: languages.isSuccess && categories.isSuccess,
    loadFailed: languages.isError || categories.isError,
  };
}
