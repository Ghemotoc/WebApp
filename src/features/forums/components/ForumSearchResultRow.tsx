/**
 * ForumSearchResultRow: one thread or post a forum search found (bundle FORUMS-1, part f;
 * S1-E8-10).
 *
 * Shows whether it is a thread (its title matched) or a post, the thread's title as a link to the
 * post itself (?post=N, which the thread page scrolls to), where and by whom it was written, and
 * the start of its words. A deleted account shows as "Deleted account"; a user ID never.
 * Who uses it: ForumSearchPage.
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';

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
    <li className="flex flex-col gap-2 border-t border-border px-5 py-4 first:border-t-0 md:px-7">
      <span className="flex">
        <InfoPill tone={isThread ? 'plum' : 'neutral'}>
          {isThread ? t('search.kindThread') : t('search.kindPost', { number: result.postNumber })}
        </InfoPill>
      </span>
      <Link
        to={address}
        className="font-heading text-lg leading-snug font-bold break-words text-heading underline-offset-2 hover:underline"
      >
        {result.threadTitle}
      </Link>
      <p className="m-0 text-[13px] text-meta">
        {t('search.where', {
          forum: result.forumName,
          name: nameOf(result.author, t('person.deleted')),
          date: threadDay(result.createdAt, i18n.language),
        })}
      </p>
      {result.snippet !== '' && (
        <p className="m-0 text-[15px] leading-relaxed break-words text-body">{result.snippet}</p>
      )}
    </li>
  );
}
