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
 * class says so above the threads.
 * The teacher's page (BOOKS-8 part 8b; board G08-ClassTeacher, user story 8.8) has five sections
 * in the tabs, the competition and the threads on the left, and "This week" (totals for the whole
 * class) and the Winner card on the right; on tablets and phones This week comes after the
 * competition. Right after "Create the class" the class's first code and link sit at the top
 * (board G07, user story 8.7). "How a class space starts" moved to class settings.
 * What it calls: ClassSpaceHeader, ClassSectionTabs, ClassCompetitionCard, ClassPointsCard,
 * ClassWeekCard, ClassThreads, ClassLatestWinner, ClassSharedStories, NewClassInviteCode,
 * SpaceHandoverOffer, SpaceWelcomeNote.
 */
import { useState } from 'react';
import { useLocation } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { ClassCompetitionCard } from '@/features/class-competitions/components/ClassCompetitionCard';
import { ClassLatestWinner } from '@/features/class-competitions/components/ClassLatestWinner';
import { ClassPointsCard } from '@/features/class-points/components/ClassPointsCard';
import { ClassWeekCard } from '@/features/class-points/components/ClassWeekCard';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { NewClassInvite } from '../api/classSpaces';
import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassSectionTabs } from './ClassSectionTabs';
import { ClassSharedStories } from './ClassSharedStories';
import { ClassSpaceHeader } from './ClassSpaceHeader';
import { ClassThreads } from './ClassThreads';
import { NewClassInviteCode } from './NewClassInviteCode';
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
 * The first code, when the teacher arrives straight from "Create the class" (board G07). The
 * code is shown this once, as everywhere: only its hash is kept.
 *
 * @param props.space - the new class
 * @returns the code and link, or nothing
 */
function FirstClassCode({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const location = useLocation();
  const state: unknown = location.state;
  const passed =
    state !== null && typeof state === 'object' && 'newInvite' in state
      ? (state.newInvite as NewClassInvite | null)
      : null;
  const [invite, setInvite] = useState(passed);
  if (invite === null) return null;
  return (
    <section aria-labelledby="class-first-code" className="flex flex-col gap-3">
      <h2 id="class-first-code" className="m-0 type-heading">
        {t('classPage.newCodeTitle')}
      </h2>
      <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('classPage.newCodeIntro')}</p>
      <NewClassInviteCode
        invite={invite}
        className={space.name}
        onDismiss={() => setInvite(null)}
      />
    </section>
  );
}

/**
 * The teacher's two columns (board G08): the competition and the threads on the left, This week
 * and the Winner card on the right, 1.9 to 1 and 64 px apart. Below 1024 px the right stack
 * dissolves and order reads: competition, This week, threads, Winner (user story 8.8).
 *
 * @returns the grid
 */
function TeacherColumns({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const teacherName = nameOf(space.owner, t('row.ownerDeleted'));
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-16">
      <div className="order-1 flex min-w-0 flex-col gap-12 empty:hidden lg:col-start-1 lg:row-start-1">
        <ClassNotes space={space} />
        <ClassCompetitionCard
          slug={space.slug}
          teacherName={teacherName}
          pupilCount={Math.max(space.memberCount - 1, 0)}
        />
      </div>
      <div className="contents lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-12">
        <div className="order-2 min-w-0 empty:hidden">
          <ClassWeekCard slug={space.slug} />
        </div>
        <div className="order-4 min-w-0 empty:hidden">
          <ClassLatestWinner slug={space.slug} />
        </div>
      </div>
      <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
        <ClassThreads space={space} />
      </div>
    </div>
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
  const isTeacher = space.viewer.membership === 'owner';
  return (
    <div className="flex flex-col gap-12">
      <SpaceBreadcrumb current={space.name} />
      {isTeacher && <FirstClassCode space={space} />}
      <ClassSpaceHeader space={space} />
      {space.viewer.canRead ? (
        <>
          <ClassSectionTabs slug={space.slug} isTeacher={isTeacher} />
          {isTeacher ? <TeacherColumns space={space} /> : <ClassColumns space={space} />}
        </>
      ) : (
        <ReadingNote space={space} />
      )}
    </div>
  );
}
