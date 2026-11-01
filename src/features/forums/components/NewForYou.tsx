/**
 * NewForYou: the "New for you" card in the forum index's side column (bundle FORUMS-1, part d;
 * story S1-E8-04; board 5.1 Forums).
 *
 * Board values: a white card with 24 px corners, the eyebrow "Since your last visit", the heading
 * "New for you" (26 px), "Each link opens at the first post you haven’t read.", then one row per
 * thread: its title (15 px, 600), its forum (13 px) and a gold "3 new" pill. Each link opens the
 * thread at its first new post (criterion 2). With nothing new it says "You’re up to date."
 * Signed out, the card isn't shown.
 * Who uses it: ForumsPage. What it calls: useNewForYou → forum_new_for_you().
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';

import type { ForumNewThread } from '../api/forumReads';
import { useNewForYou } from '../hooks/useForumReads';
import { postAddress } from '../lib/forumAddresses';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * One thread with new posts.
 *
 * @returns the row as a link to the first new post
 */
function NewThreadRow({ thread }: { thread: ForumNewThread }) {
  const { t } = useForumsTranslation();
  return (
    <li className="border-t border-hairline first:border-t-0">
      <Link
        to={postAddress(thread.forumSlug, thread.number, thread.firstUnreadPost)}
        className="flex items-start gap-3 py-3 text-ink no-underline hover:underline"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] leading-snug font-semibold break-words">{thread.title}</span>
          <span className="mt-0.5 text-[13px] text-meta">{thread.forumName}</span>
        </span>
        <InfoPill tone="gold">{t('newForYou.count', { count: thread.newCount })}</InfoPill>
      </Link>
    </li>
  );
}

/**
 * Renders the card, or nothing for a visitor.
 *
 * @returns the card
 */
export function NewForYou() {
  const { t } = useForumsTranslation();
  const { threads, loadFailed } = useNewForYou();
  if (threads === null && !loadFailed) return null;
  return (
    <section
      aria-labelledby="forums-new-heading"
      className="flex flex-col rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <Eyebrow>{t('newForYou.eyebrow')}</Eyebrow>
      <h2
        id="forums-new-heading"
        className="m-0 mt-1.5 font-heading text-[26px] font-bold text-heading"
      >
        {t('newForYou.heading')}
      </h2>
      {loadFailed && <p className="m-0 mt-2 text-[15px] text-body">{t('newForYou.loadFailed')}</p>}
      {threads !== null && threads.length === 0 && (
        <p className="m-0 mt-2 text-[15px] leading-relaxed text-body">{t('newForYou.empty')}</p>
      )}
      {threads !== null && threads.length > 0 && (
        <>
          <p className="m-0 mt-1 mb-2 text-sm text-body">{t('newForYou.note')}</p>
          <ul className="m-0 list-none p-0">
            {threads.map((thread) => (
              <NewThreadRow key={thread.number} thread={thread} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
