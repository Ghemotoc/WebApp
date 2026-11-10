/**
 * ReadingListsCard: "Reading lists" in the Library: the reader's own lists, each with its three
 * latest covers stacked, its name, how many stories it holds and who sees it, plus "New list"
 * (bundle GAPS-6; design/boards/Library.dc.html, the card "Your lists").
 *
 * Board values: one white card, a fine line between rows; each row is one link to the list's
 * page with three 44 px covers overlapping by 16 px, the name in bold, "5 stories · Only you"
 * under it and a chevron at the end. The heading is "Reading lists" alone: the board's "Your
 * lists" under a "Reading lists" eyebrow would say the same thing twice (copy rule, 9 Nov 2026).
 * Who uses it: LibraryPage. What it calls: useReadingLists → my_reading_lists() and
 * useReadingListActions().createList → create_reading_list(); a new list opens its own page.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { ListedStory } from '@/features/discovery/api/storyLists';

import type { ReadingList } from '../api/readingLists';
import { useReadingListActions, useReadingLists } from '../hooks/useReadingLists';
import { readingListAddress } from '../lib/readingListAddress';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { NewReadingListForm } from './NewReadingListForm';

/**
 * Up to three covers, each overlapping the one before; an empty list shows a dashed outline the
 * size of one cover, so every row lines up. Decoration only: the list's name is beside it.
 */
function StackedCovers({ covers }: { covers: ListedStory[] }) {
  if (covers.length === 0) {
    return (
      <span
        aria-hidden="true"
        className="block h-[58px] w-[44px] shrink-0 rounded-md border border-dashed border-border"
      />
    );
  }
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {covers.map((story, index) => (
        <DrawnCover
          key={story.slug}
          title={story.title}
          choice={resolveCoverChoice(story)}
          size="tile"
          isDecorative
          // 44 px wide and 28 px over the cover before it, so 16 px of each earlier cover shows.
          className={index === 0 ? 'w-[44px]' : '-ml-[28px] w-[44px] shadow-card'}
        />
      ))}
    </span>
  );
}

/** One list: the whole row is the link to its page. */
function ReadingListRow({ list }: { list: ReadingList }) {
  const { t } = useLibraryTranslation();
  const seenBy = t(list.isPublic ? 'lists.seenBy.public' : 'lists.seenBy.onlyYou');
  return (
    <li className="border-t border-border first:border-t-0">
      <Link
        to={readingListAddress(list.id)}
        className="flex min-h-11 items-center gap-4 py-3 text-heading no-underline hover:underline"
      >
        <StackedCovers covers={list.covers} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold break-words">{list.name}</span>
          <span className="text-[13px] text-meta">
            {t('lists.count', { count: list.storyCount })} · {seenBy}
          </span>
        </span>
        <ChevronRightIcon size={18} className="shrink-0 text-meta" />
      </Link>
    </li>
  );
}

/**
 * Renders the section, or nothing while it loads.
 *
 * @returns the heading, "New list" and the rows
 */
export function ReadingListsCard() {
  const { t } = useLibraryTranslation();
  const navigate = useNavigate();
  const { lists, loadFailed } = useReadingLists();
  const { createList } = useReadingListActions();
  const [isAdding, setIsAdding] = useState(false);
  if (loadFailed) return <Notice tone="error">{t('lists.loadFailed')}</Notice>;
  if (lists === null) return null;
  return (
    <section aria-labelledby="library-lists-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="library-lists-heading"
            className="m-0 font-heading text-[28px] font-bold text-heading"
          >
            {t('lists.heading')}
          </h2>
          <p className="m-0 text-sm text-body">{t('lists.intro')}</p>
        </div>
        {!isAdding && (
          <Button variant="secondary" onClick={() => setIsAdding(true)}>
            <ActionIcon name="plus" size={16} />
            {t('lists.new.button')}
          </Button>
        )}
      </div>
      {isAdding && (
        <NewReadingListForm
          idPrefix="library-new-list"
          onCreate={createList}
          onCreated={(listId) => void navigate(readingListAddress(listId))}
          onCancel={() => setIsAdding(false)}
        />
      )}
      <div className="rounded-card border border-border bg-surface px-5 py-2 shadow-card">
        {lists.length === 0 ? (
          <p className="m-0 py-3 text-sm text-body">{t('lists.empty')}</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {lists.map((list) => (
              <ReadingListRow key={list.id} list={list} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
