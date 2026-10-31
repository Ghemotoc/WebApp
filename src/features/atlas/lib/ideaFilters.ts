/**
 * ideaFilters: the Open, Done and All filter on the questions and ideas list (story S1-E17-28).
 *
 * Who calls it: components/IdeasPage.tsx. What it calls: nothing.
 */
import type { StoryIdea } from '../api/ideas';

/** The three filters. */
export const ideaFilters = ['open', 'done', 'all'] as const;
export type IdeaFilter = (typeof ideaFilters)[number];

/**
 * Keeps the notes a filter shows.
 *
 * @param items - the notes, in the order to show them
 * @param filter - Open (not ticked), Done (ticked) or All
 * @returns the notes that match, in the same order
 */
export function filterIdeas(items: StoryIdea[], filter: IdeaFilter): StoryIdea[] {
  if (filter === 'open') return items.filter((item) => item.doneAt === null);
  if (filter === 'done') return items.filter((item) => item.doneAt !== null);
  return items;
}
