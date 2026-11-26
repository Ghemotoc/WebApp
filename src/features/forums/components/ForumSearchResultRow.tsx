/**
 * ForumSearchResultRow: one thread or post a forum search found (bundle FORUMS-1, part f;
 * S1-E8-10; drawn as board F02 in BOOKS-7).
 *
 * Board F02: the thread's title as a link to the post itself (?post=N, which the thread page
 * scrolls to), "Re: " before it for a reply (a post after the first), then one meta line ("Thread · First chapters ·
 * inkwolf · 14 Oct · 23 replies", or "Post 3 · poppyverse · 14 Oct") and the start of the words.
 * A deleted account shows as "Deleted account"; a user ID never.
 * Who uses it: ForumSearchPage. What it calls: MetaLine and the forum address and date helpers.
 */
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';

import type { ForumSearchResult } from '../api/forumSearch';
import { postAddress } from '../lib/forumAddresses';
import { threadDay } from '../lib/forumDates';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * The facts under the title: what was found, where, by whom, when, and a thread's replies.
 *
 * @param result - the thread or post found
 * @returns the meta line's facts
 */
function useResultFacts(result: ForumSearchResult): MetaFact[] {
  const { t, i18n } = useForumsTranslation();
  const name = nameOf(result.author, t('person.deleted'));
  const day = threadDay(result.createdAt, i18n.language);
  if (result.kind === 'post') {
    return [
      { text: t('search.kindPost', { number: result.postNumber }), kind: 'state' },
      { text: name },
      { text: day },
    ];
  }
  return [
    { text: t('search.kindThread'), kind: 'state' },
    { text: result.forumName },
    { text: name },
    { text: day },
    { text: t('list.replies', { count: result.replyCount }) },
  ];
}

/**
 * Renders the row.
 *
 * @param props.result - the thread or post found
 * @returns a list item
 */
export function ForumSearchResultRow({ result }: { result: ForumSearchResult }) {
  const { t } = useForumsTranslation();
  const facts = useResultFacts(result);
  // A thread opens at its start; a post at itself.
  const address = postAddress(result.forumSlug, result.threadNumber, result.postNumber);
  // A reply's title reads "Re: …"; a thread's first post keeps the title itself.
  const isReply = result.kind === 'post' && result.postNumber > 1;
  const title = isReply
    ? t('search.replyTitle', { title: result.threadTitle })
    : result.threadTitle;
  return (
    <li className="flex flex-col gap-1 border-t border-border py-4">
      <Link
        to={address}
        className="type-label font-semibold break-words text-ink-heading no-underline underline-offset-2 hover:underline"
      >
        {title}
      </Link>
      <MetaLine facts={facts} />
      {result.snippet !== '' && (
        <p className="m-0 type-body break-words text-ink">{result.snippet}</p>
      )}
    </li>
  );
}
