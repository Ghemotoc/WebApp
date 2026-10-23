/**
 * useStoryFormOptions: the choices the new story form offers: open languages and categories
 * (story S1-E3-01).
 *
 * Who calls it: NewStoryPage. What it calls: api/stories.ts (open_story_languages() and the
 * categories table). Both change only by migration until S1-E11-05 and S1-E11-03, so one read
 * per visit is enough.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchCategories, fetchOpenLanguages, type StoryCategory } from '../api/stories';

/**
 * Loads the languages and categories.
 *
 * @returns languages, categories, whether both have loaded, and whether a read failed
 */
export function useStoryFormOptions() {
  const languages = useQuery<string[]>({
    queryKey: ['open-story-languages'],
    staleTime: Infinity,
    queryFn: async () => fetchOpenLanguages(await requireClient()),
  });
  const categories = useQuery<StoryCategory[]>({
    queryKey: ['story-categories'],
    staleTime: Infinity,
    queryFn: async () => fetchCategories(await requireClient()),
  });
  return {
    languages: languages.data ?? [],
    categories: categories.data ?? [],
    isLoaded: languages.isSuccess && categories.isSuccess,
    loadFailed: languages.isError || categories.isError,
  };
}
