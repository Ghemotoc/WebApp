/**
 * ClassSpaceContent: a class space's page, once it has loaded (bundle BOOKS-8; board G03-Class,
 * user story 8.3).
 *
 * Who shows it: SpacePage, when the space is a class (an open space keeps its own layout).
 * What it shows (board G03): the header (ClassSpaceHeader), "Class · Stories 6", then two columns
 * from 1024 px, 1.9 to 1 and 64 px apart: the competition panel, the threads and the Winner card
 * on the left; the class points box and the stories shared with the class on the right. Tablets
 * and phones read one column in the order the story gives: competition, points, threads, Winner,
 * stories. A class space never has an ad, a sponsored item or a sponsor credit (Q70).
 * A member still waiting for their account reads only the header and why they wait; a locked
 * class says so above the threads. The teacher also gets "How a class space starts" (S1-E8-11).
 * What it calls: ClassSpaceHeader, ClassSectionTabs, ClassCompetitionCard, ClassPointsCard,
 * ClassThreads, ClassLatestWinner, ClassSharedStories, ClassAboutCard, SpaceHandoverOffer,
 * SpaceWelcomeNote.
 */
import { Notice } from '@/components/ui/Notice';
import { ClassCompetitionCard } from '@/features/class-competitions/components/ClassCompetitionCard';
import { ClassLatestWinner } from '@/features/class-competitions/components/ClassLatestWinner';
import { ClassPointsCard } from '@/features/class-points/components/ClassPointsCard';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassAboutCard } from './ClassAboutCard';
import { ClassSectionTabs } from './ClassSectionTabs';
import { ClassSharedStories } from './ClassSharedStories';
import { ClassSpaceHeader } from './ClassSpaceHeader';
import { ClassThreads } from './ClassThreads';
import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceHandoverOffer } from './SpaceHandoverOffer';
import { SpaceWelcomeNote } from './SpaceWelcomeNote';

/**
 * Why the reader can't read the class yet, or nothing when they can.
 *
 * @returns the note
 */
function ReadingNote({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  if (space.viewer.waitsForAccount) {
    return <Notice tone="info">{t('threads.waitsForAccount')}</Notice>;
  }
  return <Notice tone="info">{t('threads.readLocked')}</Notice>;
}

/**
 * The left column's first part: the handover offer, the welcome note and the lock note.
 *
 * @returns the notes that apply
 */
function ClassNotes({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <>
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
    </>
  );
}

/**
 * The two columns (board G03). From 1024 px the left parts sit in rows 1 to 3 of the first
 * column and the right parts in one stack beside them; a last flexible row takes any height the
 * right stack has over the left, so the left parts keep their 48 px gaps. Below 1024 px the right
 * stack dissolves (display: contents) and order puts everything in one column: competition,
 * points, threads, Winner, stories (user story 8.3).
 *
 * @returns the grid
 */
function ClassColumns({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const teacherName = nameOf(space.owner, t('row.ownerDeleted'));
  const isTeacher = space.viewer.membership === 'owner';
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-16">
      <div className="order-1 flex min-w-0 flex-col gap-12 empty:hidden lg:col-start-1 lg:row-start-1">
        <ClassNotes space={space} />
        <ClassCompetitionCard slug={space.slug} teacherName={teacherName} />
      </div>
      <div className="contents lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-12">
        <div className="order-2 min-w-0 empty:hidden">
          <ClassPointsCard slug={space.slug} />
        </div>
        <div className="order-5 min-w-0 empty:hidden">
          <ClassSharedStories slug={space.slug} />
        </div>
        {isTeacher && (
          <div className="order-6 min-w-0">
            <ClassAboutCard space={space} />
          </div>
        )}
      </div>
      <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
        <ClassThreads space={space} />
      </div>
      <div className="order-4 flex min-w-0 flex-col gap-12 empty:hidden lg:col-start-1 lg:row-start-3">
        <ClassLatestWinner slug={space.slug} />
      </div>
    </div>
  );
}

/**
 * Renders the page's content.
 *
 * @param props.space - the class space
 * @returns the breadcrumb, the header, the section links and the columns
 */
export function ClassSpaceContent({ space }: { space: Space }) {
  return (
    <div className="flex flex-col gap-12">
      <SpaceBreadcrumb current={space.name} />
      <ClassSpaceHeader space={space} />
      {space.viewer.canRead ? (
        <>
          <ClassSectionTabs slug={space.slug} />
          <ClassColumns space={space} />
        </>
      ) : (
        <ReadingNote space={space} />
      )}
    </div>
  );
}
