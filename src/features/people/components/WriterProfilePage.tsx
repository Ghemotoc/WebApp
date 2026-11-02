/**
 * WriterProfilePage: a writer's public profile, screen 6.1 (story S1-E5-05, with S1-E6-05's
 * Follow; design/boards/Profile.dc.html).
 *
 * Who shows it: the router, at /u/:handle; the story page's writer card ("See profile") and the
 * followers list lead here.
 * What it shows: ProfileHeader (avatar, name, handle, join month, bio, numbers, Follow), then
 * ProfileStories and, when its owner lets the reader see it, ProfileLibrary (S1-E13-01) on the
 * left and, on the right, the forum signature (ProfileSignatureCard, S1-E8-08) and
 * ProfileSafetyCard (Report and Block); one column under 1024 px. The board's ad slot, forum
 * posts, rank and certificates come with their own stories (S1-E12-01, S1-E8, S1-E8-09,
 * S1-E2-11), so they aren't drawn yet.
 * No profile banners (Q50).
 * When the profile can't be shown (unknown username, removed, or this person blocks the
 * reader), the page says "This profile isn't available" and nothing more, so a block can't be
 * told from a missing profile.
 * What it calls: useWriterProfile → get_writer_profile() (ADR 0004: never the tables) and
 * useProfileSignature → profile_signature().
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { ProfileSignatureCard } from '@/features/forums/components/ProfileSignatureCard';
import { useProfileSignature } from '@/features/forums/hooks/useForumSignatures';

import type { WriterProfile } from '../api/writerProfile';
import { useWriterProfile } from '../hooks/useWriterProfile';

import { ProfileHeader } from './ProfileHeader';
import { ProfileLibrary } from './ProfileLibrary';
import { ProfileSafetyCard } from './ProfileSafetyCard';
import { ProfileStories } from './ProfileStories';

/** "This profile isn't available", with the way home. */
function ProfileUnavailable() {
  const { t } = usePeopleTranslation();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-10">
      <title>{t('profile.unavailableTitle')}</title>
      <h1 className="m-0 font-heading text-[26px] font-bold text-heading">
        {t('profile.unavailableTitle')}
      </h1>
      <p className="m-0 text-base text-body">{t('profile.unavailableBody')}</p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
      >
        {t('profile.goHome')}
      </Link>
    </div>
  );
}

/**
 * The right-hand column: the forum signature (S1-E8-08) and the safety card.
 *
 * @param props.profile - the profile
 * @param props.isSignedIn - whether someone is signed in (Report and Block need an account)
 * @returns the column, or nothing when it would be empty
 */
function ProfileSideColumn({
  profile,
  isSignedIn,
}: {
  profile: WriterProfile;
  isSignedIn: boolean;
}) {
  // The same read the card makes (shared through the query cache), so the column is drawn only
  // when it has something in it.
  const hasSignature = (useProfileSignature(profile.handle).data ?? null) !== null;
  const showsSafetyCard = !profile.isMe && isSignedIn;
  const showsSignature = hasSignature && !profile.iBlocked;
  if (!showsSafetyCard && !showsSignature) return null;
  return (
    <div className="flex w-full flex-col gap-5 lg:max-w-[340px] lg:flex-[1_1_300px]">
      {showsSignature && (
        <ProfileSignatureCard handle={profile.handle} name={profile.displayName} />
      )}
      {showsSafetyCard && <ProfileSafetyCard profile={profile} />}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the profile, a wait, or "not available"
 */
export function WriterProfilePage() {
  const { t } = usePeopleTranslation();
  const { handle = '' } = useParams();
  const { userId } = useSession();
  const { profile, isLoaded, loadFailed } = useWriterProfile(handle);

  if (loadFailed) {
    return (
      <PageContainer className="pt-12 pb-7">
        <Notice tone="error">{t('profile.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!isLoaded) return null;
  if (profile === null) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-7">
        <ProfileUnavailable />
      </PageContainer>
    );
  }
  return (
    <PageContainer className="tmc-rise flex flex-col gap-10 pt-10 pb-7">
      <title>
        {t('profile.documentTitle', { name: profile.displayName, handle: profile.handle })}
      </title>
      <ProfileHeader profile={profile} />
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:flex-[999_1_620px]">
          {!profile.iBlocked && (
            <div className="flex flex-col gap-10">
              <ProfileStories profile={profile} />
              {/* The library shelf, when the owner lets this reader see it (S1-E13-01). */}
              <ProfileLibrary profile={profile} />
            </div>
          )}
        </div>
        <ProfileSideColumn profile={profile} isSignedIn={userId !== null} />
      </div>
    </PageContainer>
  );
}
