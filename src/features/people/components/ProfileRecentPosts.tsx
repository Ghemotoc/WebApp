/**
 * ProfileRecentPosts: "Recent posts in Together", the person's three latest forum posts this
 * reader may read (bundle 3 of "Build: the full design as user stories", board C04; Robert, 25 Nov
 * 2026, 09:50 UTC: no widget missing between the canvas and the live site).
 *
 * Each row, as the board draws it: the thread's title linking to the post in its thread, and a
 * meta line with the forum's name and how long ago ("First chapters · 2 days ago"). Nothing is
 * drawn while the person has no post this reader may read: private and class spaces stay private
 * (profile_activity() counts and lists only forum_post_state_for_caller() = 'live').
 * Who uses it: WriterProfilePage. What it calls: useProfileActivity → profile_activity().
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import { recentPostHref, type ProfileRecentPost } from '../api/profileActivity';
import { useProfileActivity } from '../hooks/useProfileActivity';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/** One post: the thread's title and where and when it was posted. */
function RecentPostRow({ post }: { post: ProfileRecentPost }) {
  const { i18n } = usePeopleTranslation();
  return (
    <li className="flex flex-col gap-1 border-t border-(--hairline) py-3">
      <Link
        to={recentPostHref(post)}
        className="font-semibold break-words text-ink-heading no-underline hover:underline"
      >
        {post.threadTitle}
      </Link>
      <MetaLine
        facts={[{ text: post.forumName }, { text: timeAgo(post.postedAt, i18n.language) }]}
      />
    </li>
  );
}

/**
 * Renders the section, or nothing when there is no post to show.
 *
 * @param props.handle - the profile's username
 * @returns the section
 */
export function ProfileRecentPosts({ handle }: { handle: string }) {
  const { t } = usePeopleTranslation();
  const activity = useProfileActivity(handle).data ?? null;
  if (activity === null || activity.recentPosts.length === 0) return null;
  return (
    <section aria-labelledby="profile-posts-heading" className="flex min-w-0 flex-col">
      <h2 id="profile-posts-heading" className="m-0 mb-1 type-heading">
        {t('activity.recentPostsHeading')}
      </h2>
      <ul className="m-0 list-none p-0">
        {activity.recentPosts.map((post) => (
          <RecentPostRow
            key={`${post.forumSlug}-${String(post.threadNumber)}-${String(post.postNumber)}`}
            post={post}
          />
        ))}
      </ul>
    </section>
  );
}
