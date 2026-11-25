/**
 * HubTalk: "Talk about stories" on the Home page (bundle CALM-7c; since user story 1.1 board A01:
 * a tinted band with the thread titles two by two, each with the forum and a count as a meta
 * line, and "Together" at the top right).
 *
 * The threads with posts new to the member, as Together's "New for you" lists them, at most four;
 * each opens the thread at the first new post. With nothing new it says so in one line.
 * Who shows it: MemberHomePage. What it calls: useNewForYou → forum_new_for_you() and
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
    <section
      aria-labelledby="hub-talk"
      className="box-surface flex flex-col gap-6 rounded-card p-4 sm:p-8 lg:p-12"
    >
      {/* Board A01: a tinted band under a page-sized heading, the threads two by two. */}
      <div className="flex items-center justify-between gap-4">
        <h2 id="hub-talk" className="m-0 type-title">
          {t('hub.talk.heading')}
        </h2>
        <Link to="/forums" className={buttonClassName({ variant: 'text' })}>
          {t('hub.talk.together')}
        </Link>
      </div>
      {loadFailed && <Notice tone="error">{t('hub.talk.loadFailed')}</Notice>}
      {!loadFailed && shown.length === 0 && (
        <p className="m-0 text-ink-muted">{t('hub.talk.empty')}</p>
      )}
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
        {shown.map((thread) => (
          <li
            key={`${thread.forumSlug}-${thread.number}`}
            className="flex min-w-0 flex-col gap-1 rounded-field border border-hairline p-4"
          >
            <Link
              to={postAddress(thread.forumSlug, thread.number, thread.firstUnreadPost)}
              className="font-semibold break-words text-ink-heading no-underline hover:underline"
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
