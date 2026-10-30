/**
 * The first page of every group of search results, and how many each group holds (story
 * S1-E5-04). Kept apart from the components so a component file exports only components.
 * Who uses it: SearchResults and SearchGroupShelf.
 */
import type { StoryListPage } from '@/features/discovery/api/storyLists';

import type { FoundPage, FoundTag, FoundWriter } from '../api/search';

import type { SearchGroup } from './searchAddresses';

/** The first page of every group. */
export interface SearchGroupResults {
  stories: StoryListPage;
  writers: FoundPage<FoundWriter>;
  tags: FoundPage<FoundTag>;
}

/**
 * How many one group holds.
 *
 * @param group - which group
 * @param results - every group's first page
 * @returns the total
 */
export function groupTotal(group: SearchGroup, results: SearchGroupResults): number {
  if (group === 'writers') return results.writers.total;
  if (group === 'tags') return results.tags.total;
  return results.stories.total;
}
