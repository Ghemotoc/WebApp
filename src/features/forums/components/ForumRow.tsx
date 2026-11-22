/**
 * ForumRow: one forum on the index: its name (a link to the forum), its description, the
 * subforums inside it, its thread and post numbers and the latest post (bundle FORUMS-1, part a;
 * S1-E8-01, second criterion; board 5.1).
 *
 * Since CALM-7c (board simplified/New-Together) the row is a hairline row with no card: the
 * new-posts dot, the name and description, "312 threads · 4.1k posts" as a meta line and the
 * latest post. From 1100 px they sit in four columns (12 px, the rest, 140 px and 250 px); under
 * it everything after the dot stacks in the second column.
 * Who uses it: ForumCategorySection, and ForumPage for the subforums inside a forum (in its card,
 * so it adds the card's side padding there).
 * What it calls: ForumLatestPost and MetaLine.
 * Part d adds the new-posts dot before the name (S1-E8-04).
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { cn } from '@/lib/utils';

import type { ForumEntry } from '../api/forumIndex';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumLatestPost } from './ForumLatestPost';
import { UnreadDot } from './UnreadDot';

/** What a row needs. */
export interface ForumRowProps {
  forum: ForumEntry;
  /** The subforums inside it, in staff's order; none for a subforum. */
  subforums: ForumEntry[];
  /** True inside a card (the forum page), which needs the card's side padding. */
  isInCard?: boolean;
}

/**
 * The "Subforums: Fantasy and sci-fi openings, School and everyday life" line.
 *
 * @returns the line, or nothing when there are none
 */
function SubforumLinks({ subforums }: { subforums: ForumEntry[] }) {
  const { t } = useForumsTranslation();
  if (subforums.length === 0) return null;
  return (
    <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 type-meta">
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
 * Threads and posts, as one meta line ("312 threads · 4.1k posts").
 *
 * @returns the line
 */
function ForumNumbers({ forum }: { forum: ForumEntry }) {
  const { t, i18n } = useForumsTranslation();
  // Locale-aware short numbers: 4.1k in English, 4,1 K in Romanian (DoD: locale-aware numbers).
  const format = new Intl.NumberFormat(i18n.language, { notation: 'compact' });
  return (
    <MetaLine
      facts={[
        {
          text: t('threadCount', {
            count: forum.threadCount,
            formatted: format.format(forum.threadCount),
          }),
        },
        {
          text: t('postCount', {
            count: forum.postCount,
            formatted: format.format(forum.postCount),
          }),
        },
      ]}
    />
  );
}

/**
 * Renders the row.
 *
 * @returns a list item
 */
export function ForumRow({ forum, subforums, isInCard = false }: ForumRowProps) {
  return (
    <li
      className={cn(
        'grid grid-cols-[12px_minmax(0,1fr)] items-start gap-x-4 gap-y-2 border-t border-hairline py-4 [&>*:nth-child(n+3)]:col-start-2',
        'min-[1100px]:grid-cols-[12px_minmax(0,1fr)_140px_250px] min-[1100px]:[&>*:nth-child(n+3)]:col-start-auto',
        isInCard && 'px-5 first:border-t-0 md:px-7',
      )}
    >
      {/* The dot keeps its 12 px column even for a visitor, so the names line up. */}
      <span className="flex h-5 items-center">
        <UnreadDot isNew={forum.hasUnread} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-[15px] leading-5 font-semibold">
          <Link
            to={`/forums/${forum.slug}`}
            className="inline-flex min-h-6 items-center text-heading no-underline hover:underline"
          >
            {forum.name}
          </Link>
        </h3>
        {forum.description !== '' && <p className="m-0 text-body">{forum.description}</p>}
        <SubforumLinks subforums={subforums} />
      </div>
      <ForumNumbers forum={forum} />
      <ForumLatestPost post={forum.latestPost} />
    </li>
  );
}
