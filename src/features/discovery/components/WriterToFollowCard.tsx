/**
 * WriterToFollowCard: one writer on the "Writers to follow this week" shelf (story S1-E5-11,
 * bundle LOOK-4c; board Discover, shelf 3).
 *
 * Board values: a white card 248 px wide, 20 px padding, 14 px between rows, 24 px corners, a
 * 48 px round avatar, the name in 15 px bold and the category in 13 px under it, then the growth
 * line in 13 px and the Follow button. "+12 followers this week" shows only for 5 or more (the
 * writer stats' rule), so a small number never singles anyone out. The latest story the reader
 * may read is a link under it. No doodles on a card (the Discover page keeps its own).
 * Who shows it: RisingWritersShelf. What it calls: PersonAvatar and FollowButton (follow_writer()).
 */
import { Link } from 'react-router';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { FollowButton } from '@/features/people/components/FollowButton';

import type { RisingWriter } from '../api/risingWriters';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the card.
 *
 * @param props.writer - the writer, from rising_writers()
 * @returns the card
 */
export function WriterToFollowCard({ writer }: { writer: RisingWriter }) {
  const { t } = useDiscoveryTranslation();
  const profileAddress = `/u/${encodeURIComponent(writer.handle)}`;
  return (
    <article
      aria-label={writer.displayName}
      className="flex h-full w-[248px] flex-col gap-3.5 rounded-[24px] border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-center gap-3">
        <PersonAvatar name={writer.displayName} handle={writer.handle} size="xlarge" />
        <span className="flex min-w-0 flex-col">
          <Link
            to={profileAddress}
            className="font-bold break-words text-[15px] text-ink no-underline hover:underline"
          >
            {writer.displayName}
          </Link>
          {writer.categorySlug !== null && (
            <span className="text-[13px] text-meta">
              {t(`categories.${writer.categorySlug}`, { ns: 'writing' })}
            </span>
          )}
        </span>
      </div>
      {writer.followersThisWeek !== null && (
        <span className="text-[13px] text-body">
          {t('writersToFollow.growth', { count: writer.followersThisWeek })}
        </span>
      )}
      {writer.latestStory !== null && (
        <span className="text-[13px] text-body">
          {t('writersToFollow.latest')}{' '}
          <Link
            to={`/s/${writer.latestStory.slug}`}
            className="font-semibold break-words text-link underline"
          >
            {writer.latestStory.title}
          </Link>
        </span>
      )}
      <div className="mt-auto">
        <FollowButton
          target={{ kind: 'writer', handle: writer.handle }}
          targetLabel={writer.displayName}
        />
      </div>
    </article>
  );
}
