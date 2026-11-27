/**
 * BookshelfPlaces: one bookshelf's row of places: its books, then dashed ghost places up to the
 * number one bookshelf holds (bundle CALM-4; handover Step 2, Bookshelves).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026):
 *   - No wooden plank: the books and the ghosts stand on the page.
 *   - Each book is one link to its story, named by its title. Covers this small show the title
 *     only (DrawnCover under 100 px), so nothing is cut off.
 *   - The first ghost holds a + that links to Read, named "Find stories for <name>"; the other
 *     ghosts are decoration, hidden from screen readers.
 *   - The row never scrolls sideways: 5 places a line on phones and tablets, all 10 on one line
 *     from 1024 px.
 * Who uses it: ReadingListsCard (the Library); BookshelfBooks reuses the ghost place. What it calls: DrawnCover through
 * designsForRow(), and StoryCoverArt for uploaded covers.
 */
import { Link } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ReadingList } from '../api/readingLists';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** The grid: 5 places a line until 1024 px, then 10 on one line (16 px gaps, 24 from 600 px). */
const placesGrid =
  'm-0 grid list-none grid-cols-5 gap-4 p-0 min-[600px]:gap-6 min-[1024px]:grid-cols-10';

/** A dashed ghost place, the size and shape of a cover (also used on a bookshelf's page). */
export const ghostClasses =
  'flex aspect-[2/3] w-full items-center justify-center rounded-cover border border-dashed border-dashed-border';

/**
 * The first ghost: a + that links to Read, so an empty place says how to fill it. The bookshelf's
 * own page (BookshelfBooks) uses it too.
 *
 * @param props.name - the bookshelf's name, for the link's name ("Find stories for …")
 * @returns the link
 */
export function FindStoriesPlace({ name }: { name: string }) {
  const { t } = useLibraryTranslation();
  return (
    <Link
      to="/discover"
      aria-label={t('lists.findStories', { name })}
      className={`${ghostClasses} text-ink-muted hover:bg-tint hover:text-ink-heading`}
    >
      <ActionIcon name="plus" size={20} />
    </Link>
  );
}

/**
 * Renders the places.
 *
 * @param props.list - the bookshelf, with its latest covers (as many as one bookshelf holds)
 * @param props.places - how many places one bookshelf has (reading_list_stories_max)
 * @returns the row
 */
export function BookshelfPlaces({ list, places }: { list: ReadingList; places: number }) {
  const { t } = useLibraryTranslation();
  // Step 1: the books, as many places as the bookshelf has; neighbours never share a design.
  const books = list.covers.slice(0, places);
  const covers = designsForRow(books);
  // Step 2: the empty places after them.
  const ghostCount = Math.max(0, places - books.length);
  return (
    <ul className={placesGrid}>
      {books.map((story, index) => {
        const drawn = (
          <DrawnCover
            title={story.title}
            penName={story.writer.displayName}
            choice={covers[index] ?? resolveCoverChoice(story)}
            size="tile"
            isDecorative
            className="w-full"
          />
        );
        return (
          <li key={story.slug} className="min-w-0">
            {/* The link's name holds every word drawn on the cover, title and pen name, so a
                voice user can say what they see (WCAG 2.5.3, Label in Name). */}
            <Link
              to={`/s/${story.slug}`}
              aria-label={t('lists.coverLink', {
                title: story.title,
                penName: story.writer.displayName,
              })}
              className="block"
            >
              <StoryCoverArt story={story} drawn={drawn} className="w-full" />
            </Link>
          </li>
        );
      })}
      {Array.from({ length: ghostCount }, (_, index) => (
        <li key={`ghost-${String(index)}`} className="min-w-0">
          {index === 0 ? (
            <FindStoriesPlace name={list.name} />
          ) : (
            <span aria-hidden="true" className={ghostClasses} />
          )}
        </li>
      ))}
    </ul>
  );
}
