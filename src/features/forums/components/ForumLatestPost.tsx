/**
 * ForumLatestPost: the "Latest post" block of a forum row: the thread's title as a link, who wrote
 * it (with a Staff pill for staff) and how long ago (bundle FORUMS-1, part a; board 5.1).
 *
 * Who uses it: ForumRow. Until part b adds threads every forum shows "No posts yet".
 * What it calls: timeAgo from the comments feature for the locale-aware "12 min ago".
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { ForumLatestPost as LatestPost } from '../api/forumIndex';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the block.
 *
 * @param post - the latest post, or null when the forum has none
 * @returns the eyebrow, the thread link and the byline, or "No posts yet"
 */
export function ForumLatestPost({ post }: { post: LatestPost | null }) {
  const { t, i18n } = useForumsTranslation();
  if (post === null) {
    return <p className="m-0 text-sm text-body">{t('noPosts')}</p>;
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-l border-border pl-3 text-sm">
      <span className="eyebrow">{t('latestPost')}</span>
      <Link to={post.threadAddress} className="font-semibold break-words text-link underline">
        {post.threadTitle}
      </Link>
      <span className="flex flex-wrap items-center gap-1.5 text-body">
        <Link to={`/u/${post.writerHandle}`} className="text-link underline">
          {post.writerName}
        </Link>
        {post.isStaff && <InfoPill tone="plum">{t('staff')}</InfoPill>}
        <span aria-hidden="true">·</span>
        <time dateTime={post.postedAt}>{timeAgo(post.postedAt, i18n.language)}</time>
      </span>
    </div>
  );
}
