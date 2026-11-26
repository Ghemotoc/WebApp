/**
 * ClassThreadRow: one thread in a class page's list (bundle BOOKS-8; board G03-Class, user
 * story 8.3: "Threads: pinned first; homework shows when it is due in bold").
 *
 * Who shows it: ClassThreads.
 * What it shows: the title as a link and one meta line: Pinned and Locked in bold, the homework's
 * due moment in bold, who started it, when the last reply came and how many replies; "New" on the
 * right while the reader has not read it (S1-E8-04).
 * What it calls: nothing; ClassThreads passes the thread and its due moment.
 */
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import type { ForumThreadSummary } from '@/features/forums/api/forumThreads';
import { postAddress } from '@/features/forums/lib/forumAddresses';
import { nameOf } from '@/features/forums/lib/forumPeople';

import { dueMomentText } from '../lib/assignmentDue';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What one row needs. */
export interface ClassThreadRowProps {
  forumSlug: string;
  thread: ForumThreadSummary;
  /** The homework's due moment (ISO) while it is open, otherwise null. */
  dueAt: string | null;
}

/**
 * The row's facts, states first.
 *
 * @returns the meta line's facts
 */
function useThreadFacts({ thread, dueAt }: ClassThreadRowProps): MetaFact[] {
  const { t, i18n } = useSpacesTranslation();
  const facts: MetaFact[] = [];
  // Step 1: the states, bold and first (CALM-2, MetaLine).
  if (thread.isSticky) facts.push({ text: t('classPage.pinned'), kind: 'state' });
  if (thread.isLocked) facts.push({ text: t('classPage.locked'), kind: 'state' });
  if (dueAt !== null) {
    facts.push({
      text: t('classPage.due', { day: dueMomentText(dueAt, i18n.language) }),
      kind: 'state',
    });
  }
  // Step 2: who started it, the latest reply and how many replies.
  facts.push({ text: t('classPage.by', { name: nameOf(thread.author, t('row.ownerDeleted')) }) });
  if (thread.replyCount > 0) {
    facts.push({
      text: t('classPage.lastReply', { time: timeAgo(thread.lastPostAt, i18n.language) }),
    });
  }
  facts.push({ text: t('classPage.replies', { count: thread.replyCount }) });
  return facts;
}

/**
 * Renders the row.
 *
 * @returns one list item
 */
export function ClassThreadRow(props: ClassThreadRowProps) {
  const { t } = useSpacesTranslation();
  const { forumSlug, thread } = props;
  const facts = useThreadFacts(props);
  // An unread thread opens at its first new post (S1-E8-04 criterion 2).
  const address =
    thread.firstUnreadPost === null
      ? `/forums/${forumSlug}/${thread.number}`
      : postAddress(forumSlug, thread.number, thread.firstUnreadPost);
  return (
    <li className="flex items-center gap-3 border-t border-hairline py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={address}
          className="type-body font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {thread.title}
        </Link>
        <MetaLine facts={facts} />
      </span>
      {thread.isUnread === true && (
        <span className="flex-none type-meta font-semibold text-ink-heading">
          {t('classPage.new')}
        </span>
      )}
    </li>
  );
}
