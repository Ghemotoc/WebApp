/**
 * ThreadRow: one thread in a forum's list (bundle FORUMS-1, part b; S1-E8-02; board 5.1's rows).
 *
 * Shows the title as a link to the thread, who started it, the number of replies and when the
 * latest post came and from whom. A deleted account shows as "Deleted account"; a user ID never.
 * Who uses it: ThreadList.
 * Part d adds the new-posts dot, and an unread thread's link opens at its first new post
 * (S1-E8-04). Part e adds the Pinned and Locked pills (S1-E8-05; board 5.2's gold pill).
 * IDEAS-3f adds "Answered" when the starter marked a reply that answered it (IDEA-20261102-8).
 */
import { Link } from 'react-router';

import lockIcon from '@/assets/icons/lock.svg';
import { InfoPill } from '@/components/ui/InfoPill';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { ForumThreadSummary } from '../api/forumThreads';
import { postAddress } from '../lib/forumAddresses';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

import { UnreadDot } from './UnreadDot';

/**
 * "Pinned", "Locked" and "Answered" above the title, when they apply.
 *
 * @param props.thread - the thread
 * @returns the pills, or nothing for an ordinary thread
 */
function ThreadPills({ thread }: { thread: ForumThreadSummary }) {
  const { t } = useForumsTranslation();
  if (!thread.isSticky && !thread.isLocked && !thread.isAnswered) return null;
  return (
    <span className="flex flex-wrap gap-2">
      {thread.isSticky && <InfoPill tone="gold">{t('list.pinned')}</InfoPill>}
      {thread.isLocked && (
        <InfoPill tone="neutral">
          <img src={lockIcon} alt="" aria-hidden="true" className="size-3.5" />
          {t('list.locked')}
        </InfoPill>
      )}
      {thread.isAnswered && <InfoPill tone="sage">{t('list.answered')}</InfoPill>}
    </span>
  );
}

/**
 * Renders the row.
 *
 * @param props.forumSlug - the forum's address, for the thread's link
 * @param props.thread - the thread
 * @returns a list item
 */
export function ThreadRow({
  forumSlug,
  thread,
}: {
  forumSlug: string;
  thread: ForumThreadSummary;
}) {
  const { t, i18n } = useForumsTranslation();
  const deleted = t('person.deleted');
  // An unread thread opens at its first new post (S1-E8-04 criterion 2).
  const address =
    thread.firstUnreadPost === null
      ? `/forums/${forumSlug}/${thread.number}`
      : postAddress(forumSlug, thread.number, thread.firstUnreadPost);
  return (
    <li className="flex flex-col gap-2 border-t border-border px-5 py-4 first:border-t-0 md:flex-row md:items-center md:gap-6 md:px-7">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-2 flex">
          <UnreadDot isNew={thread.isUnread} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ThreadPills thread={thread} />
          <Link
            to={address}
            className="font-heading text-lg leading-snug font-bold break-words text-heading underline-offset-2 hover:underline"
          >
            {thread.title}
          </Link>
          <p className="m-0 text-[13px] text-meta">
            {t('list.startedBy', { name: nameOf(thread.author, deleted) })}
          </p>
        </div>
      </div>
      <p className="m-0 text-sm font-semibold whitespace-nowrap text-body">
        {t('list.replies', { count: thread.replyCount })}
      </p>
      <p className="m-0 text-[13px] text-meta md:w-56 md:text-right">
        {t('list.lastReply', {
          time: timeAgo(thread.lastPostAt, i18n.language),
          name: nameOf(thread.lastPoster, deleted),
        })}
      </p>
    </li>
  );
}
