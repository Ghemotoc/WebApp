/**
 * ProfileHeader: the top card of the profile (story S1-E5-05; board C04 of the design books,
 * bundle 3 of "Build: the full design as user stories"). On the left: the avatar beside "Writer",
 * the rank and reading level pills, the name as the page's heading and "@handle · Joined May
 * 2026"; then the Teacher and Founding member badges, the bio, the buttons and "Followers are
 * counted publicly; only <name> sees who they are." On the right, from 1024 px (under a fine line
 * below that): the numbers two by two (ProfileStats).
 *
 * The buttons, as the board draws them: Follow (S1-E6-05), Message when the visitor may write to
 * this person (S1-E9-01) and Share (ProfileShareButton); on one's own profile "Edit profile" and
 * Share. A visitor who may not message this person sees "<name> isn't taking messages right
 * now" (S1-E9-03), the same note whatever the reason, so it never tells anyone an age. The
 * board's "…" menu isn't drawn: Report and Block sit in ProfileSafetyCard instead, so they're
 * never hidden behind a menu (docs/board-fixes.md).
 * Board values: the name in the type scale's title (32 px), display (48 px) from 1024 px, the
 * handle line in the meta colour, the bio up to 640 px wide; the card's two columns 1.6 to 1,
 * 48 px apart. Never shown: year of birth, age check or email (story S1-E5-05; the database
 * doesn't send them). Since S1-E13-01: when the owner keeps the rest of their profile from this
 * reader, the join month and the bio give way to "<name> shares the rest of their profile with
 * fewer people"; and the online dot shows by the name when the owner turned online status on and
 * follows the reader.
 * Who uses it: WriterProfilePage and ProfileBookshelvesPage.
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
import { ProfileFollowersNote } from './ProfileFollowersNote';
import { ProfileShareButton } from './ProfileShareButton';
import { ProfileStats } from './ProfileStats';
import { ReaderLevelPill } from './ReaderLevelPill';

/** The action on the right: Follow for others, "Edit your profile" on one's own. */
function ProfileAction({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  if (profile.isMe) {
    return (
      <Link
        to="/settings"
        className="inline-flex h-11 items-center justify-center rounded-full button-glass px-4 type-body font-semibold no-underline"
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
    <p className="m-0 flex flex-wrap items-center gap-2 type-body break-words text-ink-muted">
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
      <p className="m-0 max-w-[640px] type-body text-ink-muted">
        {t('profile.limitedNote', { name: profile.displayName })}
      </p>
    );
  }
  return (
    <p className="m-0 max-w-[640px] type-long leading-[1.6] break-words whitespace-pre-line text-ink-muted">
      {profile.bio === '' ? t('profile.noBio') : profile.bio}
    </p>
  );
}

/** The buttons: Follow or Edit profile, Message, Share; and the note when messages are closed. */
function ProfileButtons({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ProfileAction profile={profile} />
        {/* Message, only when the database says the visitor may write to them (S1-E9-01, S1-E9-03). */}
        {profile.canMessage === true && !profile.iBlocked && (
          <Link
            to={`/messages/${profile.handle}`}
            aria-label={t('profile.messageLabel', { name: profile.displayName })}
            className="inline-flex h-11 items-center justify-center rounded-full button-glass px-4 type-body font-semibold no-underline"
          >
            {t('profile.message')}
          </Link>
        )}
        {!profile.iBlocked && (
          <ProfileShareButton handle={profile.handle} name={profile.displayName} />
        )}
      </div>
      {profile.canMessage === false && !profile.iBlocked && (
        <p className="m-0 type-body text-ink-muted">
          {t('profile.notTakingMessages', { name: profile.displayName })}
        </p>
      )}
    </div>
  );
}

/** The avatar beside "Writer", the pills, the name and the handle line. */
function ProfileIdentity({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  return (
    <div className="flex items-center gap-4">
      <ProfileAvatar name={profile.displayName} handle={profile.handle} />
      <div className="flex min-w-0 flex-col gap-2">
        <Eyebrow>{t('profile.eyebrow')}</Eyebrow>
        {/* Above the name, as the board draws them (G7a): the writing rank (S1-E8-09) and, when
            its owner shows it, the reading level. The row disappears when both are absent. */}
        {!profile.iBlocked && (
          <div className="flex flex-wrap items-center gap-2 empty:hidden">
            <ProfileRankChip handle={profile.handle} />
            <ReaderLevelPill handle={profile.handle} />
          </div>
        )}
        <h1 className="m-0 min-w-0 type-title lg:type-display break-words text-ink-heading">
          {profile.displayName}
        </h1>
        <HandleLine profile={profile} />
      </div>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.profile - the profile on the page
 * @returns the header card
 */
export function ProfileHeader({ profile }: { profile: WriterProfile }) {
  return (
    <Card className="relative grid gap-6 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:p-8">
      <div className="flex min-w-0 flex-col gap-4">
        <ProfileIdentity profile={profile} />
        {/* The Teacher badge (S1-E2-11 criterion 7) and the founding member badge (WAITLIST-1):
            never when either was given, only that it is. */}
        {(profile.isTeacher || profile.isFoundingMember) && (
          <p className="m-0 flex flex-wrap gap-2">
            {profile.isTeacher && <TeacherBadgePill isPending={false} />}
            {profile.isFoundingMember && <FoundingMemberPill />}
          </p>
        )}
        <ProfileBio profile={profile} />
        <ProfileButtons profile={profile} />
        {!profile.iBlocked && <ProfileFollowersNote profile={profile} />}
      </div>
      {/* The numbers: beside the card's words from 1024 px, under a fine line below that. */}
      <div className="border-t border-border pt-6 lg:border-0 lg:pt-0">
        <ProfileStats profile={profile} />
      </div>
    </Card>
  );
}
