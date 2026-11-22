/**
 * HubTalk: "Talk about stories" on the Home page (bundle CALM-7c; board New-Home: rows of thread
 * titles, each with the forum and a count as a meta line, and "Together" at the top right).
 *
 * The threads with posts new to the member, as Together's "New for you" lists them, at most four;
 * each opens the thread at the first new post. With nothing new it says so in one line.
 * Who shows it: WritersHubPage. What it calls: useNewForYou → forum_new_for_you() and
 * postAddress.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { useNewForYou } from '@/features/forums/hooks/useForumReads';
import { postAddress } from '@/features/forums/lib/forumAddresses';

import { useHubTranslation } from '../registerHubTranslations';

/** How many threads the section lists (board New-Home: four). */
const threadLimit = 4;

/**
 * Renders the section.
 *
 * @returns the section, or nothing while the threads load
 */
export function HubTalk() {
  const { t } = useHubTranslation();
  const { threads, loadFailed } = useNewForYou();
  if (threads === null && !loadFailed) return null;
  const shown = (threads ?? []).slice(0, threadLimit);
  return (
    <section aria-labelledby="hub-talk" className="flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 id="hub-talk" className="m-0 type-heading">
          {t('hub.talk.heading')}
        </h2>
        <Link to="/forums" className={buttonClassName({ variant: 'text' })}>
          {t('hub.talk.together')}
        </Link>
      </div>
      {loadFailed && <Notice tone="error">{t('hub.talk.loadFailed')}</Notice>}
      {!loadFailed && shown.length === 0 && <p className="m-0 text-body">{t('hub.talk.empty')}</p>}
      <ul className="m-0 list-none p-0">
        {shown.map((thread) => (
          <li
            key={`${thread.forumSlug}-${thread.number}`}
            className="flex flex-col gap-1 border-b border-hairline py-3 last:border-b-0"
          >
            <Link
              to={postAddress(thread.forumSlug, thread.number, thread.firstUnreadPost)}
              className="font-semibold break-words text-heading no-underline hover:underline"
            >
              {thread.title}
            </Link>
            <MetaLine
              facts={[
                { text: thread.forumName },
                { text: t('hub.talk.newPosts', { count: thread.newCount }) },
              ]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
