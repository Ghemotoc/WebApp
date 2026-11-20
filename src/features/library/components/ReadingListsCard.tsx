/**
 * ReadingListsCard: "Bookshelves" in the Library: the reader's own bookshelves, each drawn as its
 * books and its empty places, plus "New bookshelf" (bundle GAPS-6; redrawn in bundle CALM-4).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026; handover Step 2, Bookshelves):
 *   - Reading lists are called bookshelves ("raft", "rafturi" in Romanian); the tables keep their
 *     names.
 *   - A free member has 3 bookshelves of 10 books (the settings reading_lists_max and
 *     reading_list_stories_max, read here so a new limit needs no release). Members who already
 *     have more keep everything.
 *   - No wooden plank. Each bookshelf shows its books, then dashed ghost places up to 10; the
 *     first ghost holds a + that links to Read, named "Find stories for <name>".
 *   - Its meta line: "7 of 10 books · Only you"; a full one says "10 of 10 books · Full", never in
 *     red. Bookshelves sit 48 px apart. Under the heading: "2 of 3 bookshelves · 10 books each on
 *     the free plan".
 * Who uses it: LibraryPage. What it calls: useReadingLists → my_reading_lists(),
 * useReadingListActions().createList → create_reading_list() (a new bookshelf opens its own
 * page), useBookshelfLimits for the two limits, and BookshelfPlaces for each bookshelf's row.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { ReadingList } from '../api/readingLists';
import { useBookshelfLimits } from '../hooks/useBookshelfLimits';
import { useReadingListActions, useReadingLists } from '../hooks/useReadingLists';
import { readingListAddress } from '../lib/readingListAddress';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { BookshelfPlaces } from './BookshelfPlaces';
import { NewReadingListForm } from './NewReadingListForm';

/** One bookshelf: its name (the link to its page), its meta line and its places. */
function Bookshelf({ list, books }: { list: ReadingList; books: number }) {
  const { t } = useLibraryTranslation();
  const isFull = list.storyCount >= books;
  // "Full" replaces who sees it once the bookshelf is full; it is never drawn in red.
  const state = isFull
    ? t('lists.full')
    : t(list.isPublic ? 'lists.seenBy.public' : 'lists.seenBy.onlyYou');
  const headingId = `bookshelf-${list.id}`;
  return (
    <li className="flex flex-col gap-4" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={headingId} className="m-0 type-subheading min-w-0 break-words">
          <Link
            to={readingListAddress(list.id)}
            className="text-heading no-underline hover:underline"
          >
            {list.name}
          </Link>
        </h3>
        <p className="m-0 type-meta">
          {t('lists.books', { filled: list.storyCount, count: books })} · {state}
        </p>
      </div>
      <BookshelfPlaces list={list} places={books} />
    </li>
  );
}

/** The heading, the line with the limits and "New bookshelf". */
function BookshelvesHeader({
  shelfCount,
  isAdding,
  onAdd,
}: {
  shelfCount: number;
  isAdding: boolean;
  onAdd: () => void;
}) {
  const { t } = useLibraryTranslation();
  const limits = useBookshelfLimits();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="library-lists-heading" className="m-0 type-heading text-heading">
          {t('lists.heading')}
        </h2>
        <p className="m-0 text-sm text-body">{t('lists.intro')}</p>
        <p className="m-0 type-meta">
          {t('lists.shelvesUsed', {
            filled: shelfCount,
            shelves: limits.shelves,
            books: limits.books,
          })}
        </p>
      </div>
      {!isAdding && (
        <Button variant="secondary" onClick={onAdd}>
          <ActionIcon name="plus" size={16} />
          {t('lists.new.button')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the section, or nothing while it loads.
 *
 * @returns the heading, "New bookshelf" and the bookshelves
 */
export function ReadingListsCard() {
  const { t } = useLibraryTranslation();
  const navigate = useNavigate();
  const { lists, loadFailed } = useReadingLists();
  const { createList } = useReadingListActions();
  const limits = useBookshelfLimits();
  const [isAdding, setIsAdding] = useState(false);
  if (loadFailed) return <Notice tone="error">{t('lists.loadFailed')}</Notice>;
  if (lists === null) return null;
  return (
    <section aria-labelledby="library-lists-heading" className="flex flex-col gap-6">
      <BookshelvesHeader
        shelfCount={lists.length}
        isAdding={isAdding}
        onAdd={() => setIsAdding(true)}
      />
      {isAdding && (
        <NewReadingListForm
          idPrefix="library-new-list"
          onCreate={createList}
          onCreated={(listId) => void navigate(readingListAddress(listId))}
          onCancel={() => setIsAdding(false)}
        />
      )}
      {lists.length === 0 ? (
        <p className="m-0 text-sm text-body">{t('lists.empty')}</p>
      ) : (
        // Bookshelves sit 48 px apart (gap-12), with no plank under them (Robert, 20 Nov 2026).
        <ul className="m-0 flex list-none flex-col gap-12 p-0">
          {lists.map((list) => (
            <Bookshelf key={list.id} list={list} books={limits.books} />
          ))}
        </ul>
      )}
    </section>
  );
}
