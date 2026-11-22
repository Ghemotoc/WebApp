/**
 * NewForYou: the "New for you" box in the forum index's side column (bundle FORUMS-1, part d;
 * story S1-E8-04; board 5.1 Forums).
 *
 * Since CALM-7c (board simplified/New-Together): the one box in the side column, with "Since the
 * last visit" as a meta line over the subheading "New for you", then one row per thread: its
 * title and a meta line with its forum and "3 new" in bold (a state, no gold pill). Each link opens
 * the thread at its first new post (criterion 2). With nothing new it says "You’re up to date."
 * Signed out, the box isn't shown.
 * Who uses it: ForumsPage and ForumPage. What it calls: useNewForYou → forum_new_for_you().
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';

import type { ForumNewThread } from '../api/forumReads';
import { useNewForYou } from '../hooks/useForumReads';
import { postAddress } from '../lib/forumAddresses';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * One thread with new posts.
 *
 * @returns the row: the title as a link to the first new post, and its line
 */
function NewThreadRow({ thread }: { thread: ForumNewThread }) {
  const { t } = useForumsTranslation();
  return (
    <li className="flex flex-col gap-0.5 border-t border-hairline py-3 first:border-t-0">
      <Link
        to={postAddress(thread.forumSlug, thread.number, thread.firstUnreadPost)}
        className="text-[15px] leading-5 font-semibold break-words text-heading no-underline hover:underline"
      >
        {thread.title}
      </Link>
      <MetaLine
        facts={[
          { text: thread.forumName },
          { text: t('newForYou.count', { count: thread.newCount }), kind: 'state' },
        ]}
      />
    </li>
  );
}

/**
 * Renders the box, or nothing for a visitor.
 *
 * @returns the box
 */
export function NewForYou() {
  const { t } = useForumsTranslation();
  const { threads, loadFailed } = useNewForYou();
  if (threads === null && !loadFailed) return null;
  return (
    <section
      aria-labelledby="forums-new-heading"
      className="flex flex-col rounded-card border border-border bg-surface p-6"
    >
      <p className="m-0 type-meta">{t('newForYou.eyebrow')}</p>
      <h2 id="forums-new-heading" className="m-0 mt-0.5 mb-1 type-subheading">
        {t('newForYou.heading')}
      </h2>
      {loadFailed && <p className="m-0 mt-1 text-body">{t('newForYou.loadFailed')}</p>}
      {threads !== null && threads.length === 0 && (
        <p className="m-0 mt-1 text-body">{t('newForYou.empty')}</p>
      )}
      {threads !== null && threads.length > 0 && (
        <>
          <p className="m-0 mb-1 type-meta">{t('newForYou.note')}</p>
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
