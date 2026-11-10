/**
 * ThreadSidePanel: "This thread" with its numbers and "Something wrong?" (bundle FORUMS-1, part
 * b; S1-E8-02; board 5.2's side column).
 *
 * The numbers are Replies, Writers taking part and Last reply, as label and value rows with a fine
 * line between them (DoD). The board's Views is left out: we keep no per-reader records
 * (docs/board-fixes.md). GAPS-16a adds Follow thread under the numbers (ThreadFollowButton).
 * Who uses it: ThreadPage.
 */
import { LabelRows } from '@/components/ui/LabelRows';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { ForumThreadHeader } from '../api/forumThreads';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ThreadFollowButton } from './ThreadFollowButton';

/** The card style both boxes share. */
const card = 'flex flex-col gap-3 rounded-card border border-border bg-surface p-5';

/**
 * Renders the column.
 *
 * @param props.thread - the thread's heading and numbers
 * @returns the two boxes
 */
export function ThreadSidePanel({ thread }: { thread: ForumThreadHeader }) {
  const { t, i18n } = useForumsTranslation();
  const format = new Intl.NumberFormat(i18n.language);
  return (
    <aside aria-label={t('thread.facts.title')} className="flex flex-col gap-4">
      <section className={card}>
        <h2 className="m-0 font-heading text-xl font-bold text-heading">
          {t('thread.facts.title')}
        </h2>
        <LabelRows
          rows={[
            { label: t('thread.facts.replies'), value: format.format(thread.replyCount) },
            { label: t('thread.facts.writers'), value: format.format(thread.writerCount) },
            {
              label: t('thread.facts.lastReply'),
              value: timeAgo(thread.lastPostAt, i18n.language),
            },
          ]}
        />
        <ThreadFollowButton threadNumber={thread.number} isFollowing={thread.isFollowing} />
      </section>
      <section className="flex flex-col gap-2 rounded-card border border-panel-border bg-panel p-5">
        <h2 className="m-0 font-heading text-base font-bold text-heading">
          {t('thread.help.title')}
        </h2>
        <p className="m-0 text-sm text-body">{t('thread.help.text')}</p>
      </section>
    </aside>
  );
}
