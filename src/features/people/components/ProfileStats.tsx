/**
 * ProfileStats: the numbers row on the profile (story S1-E5-05, S1-E6-05; board 6.1): stories,
 * chapters published, reads and followers, with "only <name> sees who" under the followers
 * (Q50: the count is public, the list is the writer's only).
 *
 * Board values: numbers in Funnel Display 26 px bold, labels 13 px in the meta colour. A description
 * list, so each number is read with its label. On one's own profile the followers number is a
 * button that opens the list (FollowersDialog).
 * Who uses it: ProfileHeader. The follower count comes from useFollow (the same answer the
 * Follow button uses), so following updates it at once.
 */
import { useState, type ReactNode } from 'react';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import type { WriterProfile } from '../api/writerProfile';
import { useFollow } from '../hooks/useFollow';
import { formatStatNumber } from '../lib/formatting';

import { FollowersDialog } from './FollowersDialog';

/** One number and its label. */
function Stat({ value, label }: { value: string; label: ReactNode }) {
  return (
    // The label comes first in the markup (a description list's order) and shows under the number.
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-[13px] text-meta">{label}</dt>
      <dd className="m-0 font-heading text-[26px] font-bold text-ink">{value}</dd>
    </div>
  );
}

/** The followers label, and on one's own profile the button that opens the list. */
function FollowersLabel({ profile, count }: { profile: WriterProfile; count: number }) {
  const { t } = usePeopleTranslation();
  const [isListOpen, setIsListOpen] = useState(false);
  const privacyNote = profile.isMe
    ? t('profile.followersPrivateMine')
    : t('profile.followersPrivate', { name: profile.displayName });
  return (
    <>
      {t('profile.followers', { count })} · {privacyNote}
      {profile.isMe && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => setIsListOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex min-h-6 cursor-pointer items-center border-0 bg-transparent p-0 text-[13px] font-semibold text-link underline hover:text-link-hover"
          >
            {t('profile.seeFollowers')}
          </button>
          <FollowersDialog isOpen={isListOpen} onClose={() => setIsListOpen(false)} />
        </>
      )}
    </>
  );
}

/**
 * Renders the row.
 *
 * @returns the description list
 */
export function ProfileStats({ profile }: { profile: WriterProfile }) {
  const { t, i18n } = usePeopleTranslation();
  const follow = useFollow({ kind: 'writer', handle: profile.handle });
  const followerCount = follow.state?.followerCount ?? 0;
  const format = (count: number) => formatStatNumber(count, i18n.language);
  return (
    <dl className="m-0 flex flex-wrap gap-x-8 gap-y-4">
      <Stat
        value={format(profile.counts.stories)}
        label={t('profile.stories', { count: profile.counts.stories })}
      />
      <Stat
        value={format(profile.counts.chapters)}
        label={t('profile.chapters', { count: profile.counts.chapters })}
      />
      <Stat
        value={format(profile.counts.reads)}
        label={t('profile.reads', { count: profile.counts.reads })}
      />
      <Stat
        value={format(followerCount)}
        label={<FollowersLabel profile={profile} count={followerCount} />}
      />
    </dl>
  );
}
