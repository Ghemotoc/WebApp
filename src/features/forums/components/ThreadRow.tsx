/**
 * ThreadRow: one thread in a forum's list (bundle FORUMS-1, part b; S1-E8-02; board 5.1's rows).
 *
 * Shows the title as a link to the thread, who started it, the number of replies and when the
 * latest post came and from whom. A deleted account shows as "Deleted account"; a user ID never.
 * Who uses it: ThreadList.
 * Part d adds the new-posts dot, and an unread thread's link opens at its first new post
 * (S1-E8-04). Part e adds the Pinned and Locked pills (S1-E8-05; board 5.2's gold pill).
 * IDEAS-3f adds "Answered" when the starter marked a reply that answered it (IDEA-20261102-8).
 * CALM-9b (board simplified F03, "trow"): the pills became words. Under the title sits one meta
 * line: Pinned, Locked and Answered first in bold, then who started it, the replies and the latest
 * post.
 */
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { ForumThreadSummary } from '../api/forumThreads';
import { postAddress } from '../lib/forumAddresses';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

import { UnreadDot } from './UnreadDot';

/**
 * The thread's states, in bold, for the start of its meta line: Pinned, Locked and Answered.
 *
 * @param thread - the thread
 * @param t - the forums translator
 * @returns the state facts, empty for an ordinary thread
 */
function threadStates(
  thread: ForumThreadSummary,
  t: ReturnType<typeof useForumsTranslation>['t'],
): MetaFact[] {
  const states: MetaFact[] = [];
  // A state goes first and in bold, and the word carries it (CALM-2, MetaLine).
  if (thread.isSticky) states.push({ text: t('list.pinned'), kind: 'state' });
  if (thread.isLocked) states.push({ text: t('list.locked'), kind: 'state' });
  if (thread.isAnswered) states.push({ text: t('list.answered'), kind: 'state' });
  return states;
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
  const facts: MetaFact[] = [
    ...threadStates(thread, t),
    { text: t('list.startedBy', { name: nameOf(thread.author, deleted) }) },
    { text: t('list.replies', { count: thread.replyCount }) },
    {
      text: t('list.lastReply', {
        time: timeAgo(thread.lastPostAt, i18n.language),
        name: nameOf(thread.lastPoster, deleted),
      }),
    },
  ];
  return (
    <li className="flex flex-col gap-2 border-t border-border px-4 py-4 first:border-t-0 md:px-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-2 flex">
          <UnreadDot isNew={thread.isUnread} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            to={address}
            className="font-heading type-long leading-snug font-bold break-words text-ink-heading underline-offset-2 hover:underline"
          >
            {thread.title}
          </Link>
          {/* One quiet line: the states, who started it, the replies and the latest post. */}
          <MetaLine facts={facts} />
        </div>
      </div>
    </li>
  );
}
