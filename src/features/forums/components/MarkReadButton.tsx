/**
 * MarkReadButton: "Mark as read" on a forum or category, or "Mark all as read" on the whole
 * board (bundle FORUMS-1, part d; story S1-E8-04 criterion 3; board 5.1 Forums).
 *
 * Shown only to a signed-in reader. Its accessible name starts with its words and adds what it
 * marks ("Mark as read: Writing craft"), so several on one page can be told apart (WCAG 2.5.3).
 * A failure says so in plain words beside it.
 * Who uses it: ForumsPage, ForumCategorySection and ForumPage. What it calls: useMarkForumsRead
 * → mark_forums_read().
 */
import { Button } from '@/components/ui/Button';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMarkForumsRead } from '../hooks/useForumReads';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the button marks. */
export interface MarkReadButtonProps {
  /** The forum or category, or null for the whole board ("Mark all as read"). */
  forumSlug: string | null;
  /** Its name, for the accessible name; unused for the whole board. */
  forumName?: string;
}

/**
 * Renders the button, or nothing for a visitor.
 *
 * @returns the button and any failure
 */
export function MarkReadButton({ forumSlug, forumName = '' }: MarkReadButtonProps) {
  const { t } = useForumsTranslation();
  const { userId } = useSession();
  const marking = useMarkForumsRead();
  if (userId === null) return null;
  const isWholeBoard = forumSlug === null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        variant={isWholeBoard ? 'secondary' : 'text'}
        aria-label={isWholeBoard ? undefined : t('unread.markLabel', { name: forumName })}
        disabled={marking.isRunning}
        onClick={() => marking.run(forumSlug)}
      >
        {t(isWholeBoard ? 'unread.markAll' : 'unread.mark')}
      </Button>
      {marking.failed && (
        <span role="alert" className="text-sm font-semibold text-destructive">
          {t('unread.markFailed')}
        </span>
      )}
    </span>
  );
}
