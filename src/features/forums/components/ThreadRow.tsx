/**
 * ThreadRow: one thread in a forum's list (bundle FORUMS-1, part b; S1-E8-02; board 5.1's rows).
 *
 * Shows the title as a link to the thread, who started it, the number of replies and when the
 * latest post came and from whom. A deleted account shows as "Deleted account"; a user ID never.
 * Who uses it: ThreadList.
 */
import { Link } from 'react-router';

import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { ForumThreadSummary } from '../api/forumThreads';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

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
  return (
    <li className="flex flex-col gap-2 border-t border-border px-5 py-4 first:border-t-0 md:flex-row md:items-center md:gap-6 md:px-7">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/forums/${forumSlug}/${thread.number}`}
          className="font-heading text-lg leading-snug font-bold break-words text-heading underline-offset-2 hover:underline"
        >
          {thread.title}
        </Link>
        <p className="m-0 text-[13px] text-meta">
          {t('list.startedBy', { name: nameOf(thread.author, deleted) })}
        </p>
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
