/**
 * ForumLatestPost: the latest post of a forum row: the thread's title as a link, then who wrote it
 * and how long ago as a meta line (bundle FORUMS-1, part a; board 5.1). Since CALM-7c (board
 * simplified/New-Together) the "Latest post" eyebrow, the left rule and the Staff pill are gone;
 * a staff writer gets "Staff" as the line's first fact, in bold.
 *
 * Who uses it: ForumRow. What it calls: timeAgo from the comments feature for the locale-aware
 * "12 min ago", and MetaLine.
 */
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { ForumLatestPost as LatestPost } from '../api/forumIndex';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the block.
 *
 * @param post - the latest post, or null when the forum has none
 * @returns the thread link and its line, or "No posts yet"
 */
export function ForumLatestPost({ post }: { post: LatestPost | null }) {
  const { t, i18n } = useForumsTranslation();
  if (post === null) {
    return <p className="m-0 type-meta">{t('noPosts')}</p>;
  }
  // Step 1: the line under the title: Staff first when it applies, then the writer and the time.
  const facts: MetaFact[] = [];
  if (post.isStaff) facts.push({ text: t('staff'), kind: 'state' });
  facts.push({ text: post.writerName });
  facts.push({ text: timeAgo(post.postedAt, i18n.language) });
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="sr-only">{t('latestPost')}</span>
      <Link
        to={post.threadAddress}
        className="type-body leading-5 font-semibold break-words text-ink-heading no-underline hover:underline"
      >
        {post.threadTitle}
      </Link>
      <MetaLine facts={facts} />
    </div>
  );
}
