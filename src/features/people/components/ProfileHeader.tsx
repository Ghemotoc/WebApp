/**
 * ProfileHeader: the top card of the profile (story S1-E5-05; board 6.1): the avatar, "Writer",
 * the name as the page's heading, "@handle · Joined May 2026", the bio, the numbers and, on the
 * right, Follow (S1-E6-05) or, on one's own profile, "Edit your profile".
 *
 * Board values: the name in Bricolage 800 at clamp(36px, 4.4vw, 64px), the handle line 15 px in
 * the meta colour, the bio 18 px / 1.6 up to 640 px wide. Not shown in March, as the board's
 * later parts: the rank chip (S1-E8-09), Message (S1-E9), Share (the share sheet comes with the
 * apps) and the "…" menu (Report and Block sit in ProfileSafetyCard instead, so they're never
 * hidden behind a menu). Never shown: year of birth, age check, email, online status (story
 * S1-E5-05; the database doesn't send them).
 * Who uses it: WriterProfilePage.
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';
import { Link } from 'react-router';

import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';

import type { WriterProfile } from '../api/writerProfile';
import { formatJoinedMonth } from '../lib/formatting';

import { FollowButton } from './FollowButton';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileStats } from './ProfileStats';

/** The action on the right: Follow for others, "Edit your profile" on one's own. */
function ProfileAction({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  if (profile.isMe) {
    return (
      <Link
        to="/settings"
        className="inline-flex h-11 items-center justify-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
      >
        {t('profile.editProfile')}
      </Link>
    );
  }
  if (profile.iBlocked) return null;
  return (
    <FollowButton
      target={{ kind: 'writer', handle: profile.handle }}
      targetLabel={profile.displayName}
    />
  );
}

/**
 * Renders the card.
 *
 * @returns the header card
 */
export function ProfileHeader({ profile }: { profile: WriterProfile }) {
  const { t, i18n } = usePeopleTranslation();
  return (
    <Card className="flex flex-col gap-6 p-[clamp(20px,4vw,40px)] md:flex-row md:items-start">
      <ProfileAvatar name={profile.displayName} />
      <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-3">
        <Eyebrow>{t('profile.eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words text-heading">
          {profile.displayName}
        </h1>
        <p className="m-0 text-[15px] break-words text-meta">
          {t('profile.handleAndJoined', {
            handle: profile.handle,
            date: formatJoinedMonth(profile.joinedAt, i18n.language),
          })}
        </p>
        <p className="m-0 max-w-[640px] text-lg leading-[1.6] break-words whitespace-pre-line text-body">
          {profile.bio === '' ? t('profile.noBio') : profile.bio}
        </p>
        <ProfileStats profile={profile} />
      </div>
      <div className="flex flex-none flex-col items-start gap-3">
        <ProfileAction profile={profile} />
      </div>
    </Card>
  );
}
