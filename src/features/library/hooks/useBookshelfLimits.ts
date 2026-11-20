/**
 * useBookshelfLimits: how many bookshelves a member keeps and how many books each one holds on
 * the free plan (bundle CALM-4; Robert, 20 Nov 2026: 3 bookshelves of 10 books).
 *
 * The limits are public settings (reading_lists_max and reading_list_stories_max, migration
 * …_calm4_bookshelf_limits.sql), so a new limit needs no release; the database enforces them in
 * create_reading_list() and set_story_in_reading_list(), this only writes them in words.
 * Who calls it: ReadingListsCard and AddToReadingList.
 * What it calls: usePublicSettings → the public settings.
 */
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';

/** The free plan's limits while the settings load or can't be read. */
const fallbackShelves = 3;
const fallbackBooks = 10;

/**
 * Reads the two limits.
 *
 * @returns shelves (bookshelves a member keeps) and books (books on each bookshelf)
 */
export function useBookshelfLimits() {
  const settings = usePublicSettings();
  return {
    shelves: settings.numberOf('reading_lists_max', fallbackShelves),
    books: settings.numberOf('reading_list_stories_max', fallbackBooks),
  };
}
