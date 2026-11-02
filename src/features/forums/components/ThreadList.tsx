/**
 * ThreadList: a forum's threads, latest activity first, with "Start a thread" (bundle FORUMS-1,
 * part b; S1-E8-02; board 5.1).
 *
 * Threads with the newest post come first and never close on their own (Q45). "Show more
 * threads" reads the next page. Signed out, the button says to log in; a read-only account sees
 * it too and is told why on the next page.
 * Who uses it: ForumPage, for a forum or subforum (a category holds forums, not threads), and
 * SpacePage for a space's threads (FORUMS-2a, S1-E8-06), whose "New thread" opens the space's own
 * page (startAddress) and whose heading and note come from the space.
 * What it calls: useThreadList → forum_thread_list().
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';

import { useThreadList } from '../hooks/useForumThreads';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ThreadRow } from './ThreadRow';

/** The link style of "Start a thread". */
const startLink =
  'inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90';

/**
 * "Start a thread", or the way to log in first.
 *
 * @param props.startAddress - where "Start a thread" goes
 * @returns the link
 */
function StartThreadLink({ startAddress }: { startAddress: string }) {
  const { t } = useForumsTranslation();
  const { userId } = useSession();
  if (userId === null)
    return (
      <Link to="/sign-in" className={startLink}>
        {t('list.logInToStart')}
      </Link>
    );
  return (
    <Link to={startAddress} className={startLink}>
      {t('list.start')}
    </Link>
  );
}

/** What the list needs. */
export interface ThreadListProps {
  /** The forum's address. */
  forumSlug: string;
  /** Where "Start a thread" goes; a forum's own new-thread page when left out. */
  startAddress?: string;
  /** A line under the heading (a space's "Only members can post here"), or nothing. */
  note?: string;
  /** False hides "Start a thread" (a space the reader can't post in and can't join). */
  canStart?: boolean;
}

/**
 * The card's top: "Threads", "Start a thread" and the optional note.
 *
 * @returns the heading row
 */
function ThreadListHeading({ forumSlug, startAddress, note, canStart = true }: ThreadListProps) {
  const { t } = useForumsTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-7">
      <h2 id="thread-list-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('list.heading')}
      </h2>
      {canStart && <StartThreadLink startAddress={startAddress ?? `/forums/${forumSlug}/new`} />}
      {note !== undefined && <p className="m-0 w-full text-sm text-body">{note}</p>}
    </div>
  );
}

/**
 * Renders the list.
 *
 * @returns a card with the heading, the button and the threads
 */
export function ThreadList({ forumSlug, startAddress, note, canStart = true }: ThreadListProps) {
  const { t } = useForumsTranslation();
  const list = useThreadList(forumSlug);
  return (
    <section
      aria-labelledby="thread-list-heading"
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <ThreadListHeading
        forumSlug={forumSlug}
        startAddress={startAddress}
        note={note}
        canStart={canStart}
      />
      {list.loadFailed && (
        <div className="p-5">
          <Notice tone="error">{t('list.loadFailed')}</Notice>
        </div>
      )}
      {list.threads !== null && list.threads.length === 0 && (
        <p className="m-0 px-5 py-5 text-base text-body md:px-7">{t('forum.noThreads')}</p>
      )}
      {list.threads !== null && list.threads.length > 0 && (
        <ul className="m-0 list-none p-0">
          {list.threads.map((thread) => (
            <ThreadRow key={thread.number} forumSlug={forumSlug} thread={thread} />
          ))}
        </ul>
      )}
      {list.hasMore && (
        <div className="flex justify-center border-t border-border p-4">
          <Button variant="secondary" onClick={list.showMore} disabled={list.isLoadingMore}>
            {t('list.showMore')}
          </Button>
        </div>
      )}
    </section>
  );
}
