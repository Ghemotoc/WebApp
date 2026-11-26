/**
 * WriterProfilePage: a writer's public profile (story S1-E5-05, with S1-E6-05's Follow; board C04
 * of the design books, bundle 3 of "Build: the full design as user stories"; Robert, 25 Nov 2026,
 * 09:50 UTC: no widget missing between the canvas and the live site).
 *
 * Who shows it: the router, at /u/:handle; the story page's writer card ("See profile") and the
 * followers list lead here.
 * What it shows: ProfileHeader (avatar, name, handle, join month, bio, Follow, Message, Share and
 * the numbers two by two), then two columns 1.6 to 1 from 1024 px, one column below:
 *   - on the left, ProfileStories (rows with Follow story and "See every story"),
 *     ProfileRecentPosts ("Recent posts in Together"), ProfileLibrary when its owner lets the
 *     reader see it (S1-E13-01) and the wide ad slot (S1-E12-01, position 1);
 *   - on the right, the rank card (RankPanel, S1-E8-09), the reading level card (ReaderLevelPanel,
 *     G7a: for others only when its owner shows it), ProfileAlsoOn (bookshelves, posts, spaces),
 *     the forum signature (ProfileSignatureCard, S1-E8-08), ProfileSafetyCard (Report and Block)
 *     and the side box ad slot (position 2, under the safety card, as board C04 draws it).
 * Certificates come with their own story (S1-E2-11). No profile banners (Q50).
 * When the profile can't be shown (unknown username, removed, or this person blocks the
 * reader), the page says "This profile isn't available" and nothing more, so a block can't be
 * told from a missing profile.
 * What it calls: useWriterProfile → get_writer_profile() (ADR 0004: never the tables),
 * useProfileActivity → profile_activity(), useProfileSignature → profile_signature(),
 * useProfileRank → profile_rank() and useProfileReaderLevel → profile_reader_level().
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { ProfileSignatureCard } from '@/features/forums/components/ProfileSignatureCard';
import { RankPanel } from '@/features/forums/components/RankPanel';
import { useProfileSignature } from '@/features/forums/hooks/useForumSignatures';
import { useProfileRank } from '@/features/forums/hooks/useWriterRank';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import { showsReaderLevelPanel } from '../api/readerLevel';
import type { WriterProfile } from '../api/writerProfile';
import { useProfileReaderLevel } from '../hooks/useReaderLevel';
import { useWriterProfile } from '../hooks/useWriterProfile';

import { ProfileAlsoOn } from './ProfileAlsoOn';
import { ProfileHeader } from './ProfileHeader';
import { ProfileLibrary } from './ProfileLibrary';
import { ProfileUnavailable } from './ProfileUnavailable';
import { ProfileRecentPosts } from './ProfileRecentPosts';
import { ProfileSafetyCard } from './ProfileSafetyCard';
import { ProfileStories } from './ProfileStories';
import { ReaderLevelPanel } from './ReaderLevelPanel';

/**
 * Which cards the side column draws: the rank card (S1-E8-09), the reading level card (G7a) and
 * the signature (S1-E8-08), each only when there is one and the reader isn't blocked by the person.
 *
 * @param profile - the profile on the page
 * @returns whether to show each card
 */
function useForumCards(profile: WriterProfile) {
  // The same reads the cards make (shared through the query cache), so the column is drawn only
  // when it has something in it.
  const hasSignature = (useProfileSignature(profile.handle).data ?? null) !== null;
  const hasRank = (useProfileRank(profile.handle).data ?? null) !== null;
  const hasReaderLevel = showsReaderLevelPanel(useProfileReaderLevel(profile.handle).data ?? null);
  return {
    showsSignature: hasSignature && !profile.iBlocked,
    showsRank: hasRank && !profile.iBlocked,
    showsReaderLevel: hasReaderLevel && !profile.iBlocked,
  };
}

/**
 * The right-hand column: the rank and reading level cards, "Also on", the forum signature, the
 * safety card and the side box ad slot (board C04).
 *
 * @param props.profile - the profile
 * @param props.isSignedIn - whether someone is signed in (Report and Block need an account)
 * @returns the column
 */
function ProfileSideColumn({
  profile,
  isSignedIn,
}: {
  profile: WriterProfile;
  isSignedIn: boolean;
}) {
  const { showsRank, showsReaderLevel, showsSignature } = useForumCards(profile);
  const showsSafetyCard = !profile.isMe && isSignedIn;
  return (
    <div className="flex min-w-0 flex-col gap-8">
      {/* The rank card comes first, as on the board (S1-E8-09). */}
      {showsRank && <RankPanel handle={profile.handle} name={profile.displayName} />}
      {/* The reading level card sits under the rank card, as on the board (G7a). */}
      {showsReaderLevel && <ReaderLevelPanel handle={profile.handle} name={profile.displayName} />}
      {!profile.iBlocked && <ProfileAlsoOn handle={profile.handle} />}
      {showsSignature && (
        <ProfileSignatureCard handle={profile.handle} name={profile.displayName} />
      )}
      {showsSafetyCard && <ProfileSafetyCard profile={profile} />}
      {/* The side box under the safety card (board C04); staff book it in Sponsors › Placements. */}
      {!profile.iBlocked && <PageAdSlot pageKey="profile" position={2} />}
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
      <PageContainer className="pt-12 pb-6">
        <Notice tone="error">{t('profile.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!isLoaded) return null;
  if (profile === null) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-6">
        <ProfileUnavailable />
      </PageContainer>
    );
  }
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-8 pb-6">
      <title>
        {t('profile.documentTitle', { name: profile.displayName, handle: profile.handle })}
      </title>
      <ProfileHeader profile={profile} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0">
          {!profile.iBlocked && (
            <div className="flex flex-col gap-12">
              <ProfileStories profile={profile} />
              <ProfileRecentPosts handle={profile.handle} />
              {/* The library shelf, when the owner lets this reader see it (S1-E13-01). */}
              <ProfileLibrary profile={profile} />
              {/* The wide ad slot (S1-E12-01); a profile has no category, so no context. */}
              <PageAdSlot pageKey="profile" position={1} />
            </div>
          )}
        </div>
        <ProfileSideColumn profile={profile} isSignedIn={userId !== null} />
      </div>
    </PageContainer>
  );
}
