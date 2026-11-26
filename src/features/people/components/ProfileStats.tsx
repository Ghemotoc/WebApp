/**
 * ProfileStats: the profile's numbers, two by two (story S1-E5-05, S1-E6-05; board C04 of the
 * design books, bundle 3 of "Build: the full design as user stories"): chapters published, reads,
 * followers and, since bundle 3, how many accounts the person follows.
 *
 * Board values: the label above the number (13 px in the meta colour), the number in Funnel
 * Display bold, in a two-column grid. A description list, so each number is read with its label.
 * The stories count left the grid with board C04: "Stories by <name>" lists them just below. The
 * followers count is public and the list the owner's only (Q50); ProfileHeader says so under the
 * buttons, and on one's own profile adds "See who follows you".
 * Who uses it: ProfileHeader. The follower count comes from useFollow (the same answer the
 * Follow button uses), so following updates it at once; Following comes from
 * useProfileActivity → profile_activity(), and is left out while that can't be read.
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';

import type { WriterProfile } from '../api/writerProfile';
import { useFollow } from '../hooks/useFollow';
import { useProfileActivity } from '../hooks/useProfileActivity';
import { formatStatNumber } from '../lib/formatting';

/** One label and its number. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-meta text-ink-muted">{label}</dt>
      <dd className="m-0 font-heading type-heading font-bold text-ink">{value}</dd>
    </div>
  );
}

/**
 * Renders the grid.
 *
 * @param props.profile - the profile on the page
 * @returns the description list
 */
export function ProfileStats({ profile }: { profile: WriterProfile }) {
  const { t, i18n } = usePeopleTranslation();
  const follow = useFollow({ kind: 'writer', handle: profile.handle });
  const activity = useProfileActivity(profile.handle).data ?? null;
  const followerCount = follow.state?.followerCount ?? 0;
  const format = (count: number) => formatStatNumber(count, i18n.language);
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-8 gap-y-6">
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
        label={t('profile.followers', { count: followerCount })}
      />
      {activity !== null && (
        <Stat value={format(activity.following)} label={t('profile.following')} />
      )}
    </dl>
  );
}
