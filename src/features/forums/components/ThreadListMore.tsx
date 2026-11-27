/**
 * ThreadListMore: "Show more threads" with "7 of 312 threads" beside it, under a thread list
 * (bundle BOOKS-7, boards F03 and F08, user stories 7.3 and 7.8).
 *
 * Who uses it: ThreadList. What it calls: nothing; the list reads the next page.
 */
import { Button } from '@/components/ui/Button';

import { useForumsTranslation } from '../registerForumsTranslations';

/** What the row needs. */
export interface ThreadListMoreProps {
  shown: number;
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onShowMore: () => void;
}

/**
 * Renders the row; with nothing more to show, only the count stays, so the reader knows the list
 * is whole.
 *
 * @returns the row
 */
export function ThreadListMore({
  shown,
  total,
  hasMore,
  isLoadingMore,
  onShowMore,
}: ThreadListMoreProps) {
  const { t } = useForumsTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-4 md:px-6">
      {hasMore && (
        <Button variant="secondary" onClick={onShowMore} disabled={isLoadingMore}>
          {t('list.showMore')}
        </Button>
      )}
      <p className="m-0 type-meta text-ink-muted" aria-live="polite">
        {t('list.shownOf', { count: total, shown })}
      </p>
    </div>
  );
}
