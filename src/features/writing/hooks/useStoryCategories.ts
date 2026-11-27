/**
 * useStoryCategories: the story categories, in the order the forms and filters show them (story
 * S1-E3-01; split from useStoryFormOptions in S1-E3-01's any-language change, so the readers'
 * filters read the categories without loading the list of every language).
 *
 * Who calls it: useStoryFormOptions (the writer's and staff's forms) and StoryListFilters (See
 * all). What it calls: api/stories.ts → the categories table. Staff change the categories on
 * Staff › Settings (S1-E11-03), so they are read again after five minutes.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchCategories, type StoryCategory } from '../api/stories';

/** How long the categories stay fresh: staff rarely change them. */
const categoriesFreshMilliseconds = 5 * 60 * 1000;

/**
 * Loads the categories.
 *
 * @returns the categories (empty until read), whether they loaded and whether the read failed
 */
export function useStoryCategories() {
  const categories = useQuery<StoryCategory[]>({
    queryKey: ['story-categories'],
    staleTime: categoriesFreshMilliseconds,
    queryFn: async () => fetchCategories(await requireClient()),
  });
  return {
    categories: categories.data ?? [],
    isLoaded: categories.isSuccess,
    loadFailed: categories.isError,
  };
}
