/**
 * ForumSearchResultRow: one thread or post a forum search found (bundle FORUMS-1, part f;
 * S1-E8-10).
 *
 * Shows whether it is a thread (its title matched) or a post, the thread's title as a link to the
 * post itself (?post=N, which the thread page scrolls to), where and by whom it was written, and
 * the start of its words. A deleted account shows as "Deleted account"; a user ID never.
 * CALM-9b (board simplified F02): no pill; "Thread" or "Post #3" is a bold word above the title,
 * the state that goes first in a meta line.
 * Who uses it: ForumSearchPage.
 */
import { Link } from 'react-router';

import type { ForumSearchResult } from '../api/forumSearch';
import { postAddress } from '../lib/forumAddresses';
import { threadDay } from '../lib/forumDates';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the row.
 *
 * @param props.result - the thread or post found
 * @returns a list item
 */
export function ForumSearchResultRow({ result }: { result: ForumSearchResult }) {
  const { t, i18n } = useForumsTranslation();
  const isThread = result.kind === 'thread';
  // A thread opens at its start; a post at itself.
  const address = postAddress(result.forumSlug, result.threadNumber, result.postNumber);
  return (
    <li className="flex flex-col gap-2 border-t border-border px-4 py-4 first:border-t-0 md:px-6">
      {/* A span, not a paragraph: the kind and the title read as two lines, not with a gap. */}
      <span className="block type-meta font-semibold text-ink">
        {isThread ? t('search.kindThread') : t('search.kindPost', { number: result.postNumber })}
      </span>
      <Link
        to={address}
        className="font-heading type-long leading-snug font-bold break-words text-ink-heading underline-offset-2 hover:underline"
      >
        {result.threadTitle}
      </Link>
      <p className="m-0 type-meta text-ink-muted">
        {t('search.where', {
          forum: result.forumName,
          name: nameOf(result.author, t('person.deleted')),
          date: threadDay(result.createdAt, i18n.language),
        })}
      </p>
      {result.snippet !== '' && (
        <p className="m-0 type-body leading-relaxed break-words text-ink-muted">{result.snippet}</p>
      )}
    </li>
  );
}
