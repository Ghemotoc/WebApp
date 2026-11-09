/**
 * SpacePage: one space, at /spaces/:spaceSlug (bundle FORUMS-2, part a; story S1-E8-06;
 * design/boards/Space.dc.html).
 *
 * Who shows it: the router; every space row, the forum index's Spaces card and a space thread's
 * breadcrumb link here. Anyone can read a space the database lets them see.
 * What it shows, as on the board: the breadcrumb, the header (SpaceHeaderCard), the space's
 * threads with "New thread" (the forums' ThreadList on the space's own forum), and beside them
 * the owner's requests (owner only), the rules and who runs it. Where only members may read, a
 * reader outside it sees a note instead of the threads (criterion 5).
 * Moderators (part b, S1-E8-07) show in "Who runs it", and the requests card shows for anyone
 * holding the members power. In a class space (bundle CLASSES, part a; S1-E8-11), a member whose
 * account isn't fully active yet (a student waiting for a parent's consent) is told why they
 * can't read, and there are no join requests: students join with the teacher's code. Part b adds
 * the "This space is locked." note above the threads of a locked class (nobody can post) and
 * ClassAboutCard in the side column, and the stories shared only with the class above the threads
 * (ClassStoriesCard, bundle CLASSES, part c). The owner's welcome note shows at the top for a
 * new member until "Got it" (SpaceWelcomeNote; bundle 14d IDEAS-3, part d). Above it, the
 * moderator the owner offered the space to sees the offer with Accept and Decline
 * (SpaceHandoverOffer, part e). Not yet, as noted in docs/board-fixes.md: Share and the ad slot.
 * What it calls: useSpace → space_page().
 */
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { ThreadList } from '@/features/forums/components/ThreadList';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import type { Space } from '../api/spaces';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassAboutCard } from './ClassAboutCard';
import { ClassStoriesCard } from './ClassStoriesCard';
import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceHeaderCard } from './SpaceHeaderCard';
import { SpaceNotFound } from './SpaceNotFound';
import { SpaceRequestsCard } from './SpaceRequestsCard';
import { SpaceRulesCard } from './SpaceRulesCard';
import { SpaceRunsCard } from './SpaceRunsCard';
import { SpaceHandoverOffer } from './SpaceHandoverOffer';
import { SpaceWelcomeNote } from './SpaceWelcomeNote';

/**
 * The line under "Threads" for a reader who can't post (members-only posting, criterion 4).
 *
 * @param space - the space
 * @returns the line's key, or null when the reader may post or the space takes anyone's posts
 */
function postingNoteKey(space: Space): string | null {
  // A locked class has its own note above the threads.
  if (space.viewer.canPost || space.posting === 'anyone' || space.isLocked) return null;
  return space.joining === 'approve' ? 'threads.membersOnlyApprove' : 'threads.membersOnly';
}

/**
 * The threads, or why the reader can't read them.
 *
 * @returns the thread list or a note
 */
function SpaceThreads({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const { userId } = useSession();
  if (space.viewer.waitsForAccount) {
    return <Notice tone="info">{t('threads.waitsForAccount')}</Notice>;
  }
  if (!space.viewer.canRead) return <Notice tone="info">{t('threads.readLocked')}</Notice>;
  const noteKey = postingNoteKey(space);
  return (
    <ThreadList
      forumSlug={space.forumSlug}
      startAddress={`/spaces/${space.slug}/new`}
      note={noteKey === null ? undefined : t(noteKey)}
      canStart={userId === null || space.viewer.canPost}
    />
  );
}

/**
 * The space, once it has loaded.
 *
 * @returns the breadcrumb, the header and the two columns
 */
function SpaceContent({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <>
      <SpaceBreadcrumb current={space.name} />
      <SpaceHeaderCard space={space} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <SpaceHandoverOffer space={space} />
          <SpaceWelcomeNote space={space} />
          {space.isLocked && (
            <Notice
              tone="info"
              title={t(space.isArchived ? 'classSpace.archivedTitle' : 'classSpace.lockedTitle')}
            >
              {t('classSpace.lockedText')}
            </Notice>
          )}
          {space.kind === 'class' && space.viewer.canRead && <ClassStoriesCard space={space} />}
          <SpaceThreads space={space} />
          {/* A public space's ad slot; a class space never has one (Q70; the server agrees). */}
          {space.kind !== 'class' && (
            <PageAdSlot pageKey="space" position={1} context={{ spaceSlug: space.slug }} />
          )}
        </div>
        <aside className="flex flex-col gap-6">
          {space.joining === 'approve' && space.kind === 'open' && (
            <SpaceRequestsCard space={space} />
          )}
          <SpaceRulesCard space={space} />
          <SpaceRunsCard space={space} />
          {space.kind === 'class' && <ClassAboutCard space={space} />}
        </aside>
      </div>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the space, a "not here" note, or a load error
 */
export function SpacePage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const read = useSpace(spaceSlug);
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
      {read.data === null && <SpaceNotFound />}
      {read.data !== undefined && read.data !== null && <SpaceContent space={read.data} />}
    </PageContainer>
  );
}
