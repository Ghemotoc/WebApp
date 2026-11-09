/**
 * ForumRow: one forum on the index: its name (a link to the forum), its description, the
 * subforums inside it, its thread and post numbers and the latest post (bundle FORUMS-1, part a;
 * S1-E8-01, second criterion; board 5.1).
 *
 * Who uses it: ForumCategorySection, and ForumPage for the subforums inside a forum.
 * What it calls: ForumLatestPost.
 * Part d adds the new-posts dot before the name (S1-E8-04).
 */
import { Link } from 'react-router';

import type { ForumEntry } from '../api/forumIndex';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumLatestPost } from './ForumLatestPost';
import { UnreadDot } from './UnreadDot';

/** What a row needs. */
export interface ForumRowProps {
  forum: ForumEntry;
  /** The subforums inside it, in staff's order; none for a subforum. */
  subforums: ForumEntry[];
}

/**
 * The "Subforums: Fantasy and sci-fi openings · School and everyday life" line.
 *
 * @returns the line, or nothing when there are none
 */
function SubforumLinks({ subforums }: { subforums: ForumEntry[] }) {
  const { t } = useForumsTranslation();
  if (subforums.length === 0) return null;
  return (
    <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-body">
      <span>{t('subforums')}</span>
      {subforums.map((subforum) => (
        <Link key={subforum.id} to={`/forums/${subforum.slug}`} className="text-link underline">
          {subforum.name}
        </Link>
      ))}
    </p>
  );
}

/**
 * Threads and posts, as a two-pair list ("Threads 312 · Posts 4.1k").
 *
 * @returns the numbers
 */
function ForumNumbers({ forum }: { forum: ForumEntry }) {
  const { t, i18n } = useForumsTranslation();
  // Locale-aware short numbers: 4.1k in English, 4,1 K in Romanian (DoD: locale-aware numbers).
  const format = new Intl.NumberFormat(i18n.language, { notation: 'compact' });
  const pairs = [
    { label: t('threads'), value: forum.threadCount },
    { label: t('posts'), value: forum.postCount },
  ];
  return (
    <dl className="m-0 flex gap-5">
      {pairs.map((pair) => (
        <div key={pair.label} className="flex flex-col">
          <dt className="text-xs text-body">{pair.label}</dt>
          <dd className="m-0 text-base font-semibold text-heading">{format.format(pair.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Renders the row.
 *
 * @returns a list item
 */
export function ForumRow({ forum, subforums }: ForumRowProps) {
  return (
    <li className="grid gap-3 border-t border-border px-5 py-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,250px)] md:items-center md:gap-4 md:px-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 flex items-center gap-2.5 text-base font-semibold">
          <UnreadDot isNew={forum.hasUnread} />
          <Link
            to={`/forums/${forum.slug}`}
            className="inline-flex min-h-6 items-center text-heading no-underline hover:underline"
          >
            {forum.name}
          </Link>
        </h3>
        {forum.description !== '' && <p className="m-0 text-sm text-body">{forum.description}</p>}
        <SubforumLinks subforums={subforums} />
      </div>
      <ForumNumbers forum={forum} />
      <ForumLatestPost post={forum.latestPost} />
    </li>
  );
}
