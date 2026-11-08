/**
 * ProfileHeader: the top card of the profile (story S1-E5-05; board 6.1): the avatar, "Writer",
 * the name as the page's heading, "@handle · Joined May 2026", the bio, the numbers and, on the
 * right, Follow (S1-E6-05) or, on one's own profile, "Edit your profile". A writer with the
 * Teacher badge gets a "Teacher" pill under the handle line (S1-E2-11). Under Follow, a visitor who
 * may message this person gets "Message", which opens the chat (S1-E9-01); one who may not sees
 * "<name> isn't taking messages right now" (S1-E9-03), the same note whatever the reason, so it
 * never tells anyone an age.
 *
 * Board values: the name in Bricolage 800 at clamp(36px, 4.4vw, 64px), the handle line 15 px in
 * the meta colour, the bio 18 px / 1.6 up to 640 px wide. Beside the name sits the gold rank
 * pill (S1-E8-09, ProfileRankChip). Not shown yet, as the board's later parts: Share (the share
 * sheet comes with the apps) and the "…" menu (Report and Block sit in ProfileSafetyCard instead, so they're never
 * hidden behind a menu). Never shown: year of birth, age check or email (story S1-E5-05; the
 * database doesn't send them). Since S1-E13-01: when the owner keeps the rest of their profile
 * from this reader, the join month and the bio give way to "<name> shares the rest of their
 * profile with fewer people"; and the online dot shows by the name when the owner turned online
 * status on and follows the reader.
 * Who uses it: WriterProfilePage.
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';
import { Link } from 'react-router';

import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { OnlineDot } from '@/features/privacy/components/OnlineDot';
import { useOnlineHandles } from '@/features/privacy/hooks/useOnlineStatus';
import { ProfileRankChip } from '@/features/forums/components/ProfileRankChip';
import { TeacherBadgePill } from '@/features/teacher-badge/components/TeacherBadgePill';
import { FoundingMemberPill } from '@/features/waitlist/components/FoundingMemberPill';

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
        className="inline-flex h-11 items-center justify-center rounded-full button-glass px-5 text-sm font-semibold no-underline"
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

/** "@handle · Joined May 2026", or the handle alone when the profile is limited. */
function HandleLine({ profile }: { profile: WriterProfile }) {
  const { t, i18n } = usePeopleTranslation();
  const online = useOnlineHandles(profile.isMe ? [] : [profile.handle]);
  const words =
    profile.joinedAt === null
      ? `@${profile.handle}`
      : t('profile.handleAndJoined', {
          handle: profile.handle,
          date: formatJoinedMonth(profile.joinedAt, i18n.language),
        });
  return (
    <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] break-words text-meta">
      {words}
      <OnlineDot isOnline={online.has(profile.handle.toLowerCase())} />
    </p>
  );
}

/** The bio, "No bio yet", or the limited profile's note. */
function ProfileBio({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  if (profile.isLimited) {
    return (
      <p className="m-0 max-w-[640px] text-base text-meta">
        {t('profile.limitedNote', { name: profile.displayName })}
      </p>
    );
  }
  return (
    <p className="m-0 max-w-[640px] text-lg leading-[1.6] break-words whitespace-pre-line text-body">
      {profile.bio === '' ? t('profile.noBio') : profile.bio}
    </p>
  );
}

/**
 * Renders the card.
 *
 * @returns the header card
 */
export function ProfileHeader({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  return (
    <Card className="relative flex flex-col gap-6 p-[clamp(20px,4vw,40px)] md:flex-row md:items-start">
      <ProfileAvatar name={profile.displayName} handle={profile.handle} />
      <div className="flex min-w-0 flex-col gap-3 md:flex-[999_1_420px]">
        <Eyebrow>{t('profile.eyebrow')}</Eyebrow>
        {/* The name and, beside it, the writer's rank (S1-E8-09), as the board draws them. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="m-0 min-w-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words text-heading">
            {profile.displayName}
          </h1>
          {!profile.iBlocked && <ProfileRankChip handle={profile.handle} />}
        </div>
        <HandleLine profile={profile} />
        {/* The Teacher badge (S1-E2-11 criterion 7) and the founding member badge (WAITLIST-1):
            never when either was given, only that it is. */}
        {(profile.isTeacher || profile.isFoundingMember) && (
          <p className="m-0 flex flex-wrap gap-2">
            {profile.isTeacher && <TeacherBadgePill isPending={false} />}
            {profile.isFoundingMember && <FoundingMemberPill />}
          </p>
        )}
        <ProfileBio profile={profile} />
        <ProfileStats profile={profile} />
      </div>
      <div className="flex flex-none flex-col items-start gap-3">
        <ProfileAction profile={profile} />
        {/* Message, only when the database says the visitor may write to them (S1-E9-01, S1-E9-03). */}
        {profile.canMessage === true && !profile.iBlocked && (
          <Link
            to={`/messages/${profile.handle}`}
            aria-label={t('profile.messageLabel', { name: profile.displayName })}
            className="inline-flex h-11 items-center justify-center rounded-full button-glass px-5 text-sm font-semibold no-underline"
          >
            {t('profile.message')}
          </Link>
        )}
        {profile.canMessage === false && !profile.iBlocked && (
          <p className="m-0 max-w-[260px] text-sm text-meta">
            {t('profile.notTakingMessages', { name: profile.displayName })}
          </p>
        )}
      </div>
    </Card>
  );
}
