/**
 * ClassSpaceHeader: the top of a class space's page (bundle BOOKS-8; board G03-Class, user
 * story 8.3).
 *
 * Who shows it: ClassSpaceContent.
 * What it shows (board G03): the banner strip (7 to 1), the class's name as the page title, one
 * meta line "Private · Only the class can see this space · 28 pupils · teacher Ms Ionescu", the
 * description, and "Share a story" for a member who may post. No box around it.
 * Beyond the board: Leave space for a pupil, the teacher's tool links (settings, members, log) and
 * Report for everyone but the teacher (CLAUDE.md rule 6) sit in a quiet row under it.
 * What it calls: SpaceBannerBand, ShareClassStory, useMembership → leave_space(), SpaceToolLinks,
 * ReportButton.
 */
import { Button } from '@/components/ui/Button';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { nameOf } from '@/features/forums/lib/forumPeople';
import { ReportButton } from '@/features/reporting/components/ReportButton';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { Space } from '../api/spaces';
import { useSpaceBannerView } from '../hooks/useSpaceBanner';
import { useMembership } from '../hooks/useSpaces';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ShareClassStory } from './ShareClassStory';
import { SpaceBannerBand } from './SpaceBannerBand';
import { SpaceToolLinks } from './SpaceToolLinks';

/**
 * The meta line's facts: "Locked" while the class is locked, then private, who sees it, how many
 * pupils and the teacher.
 *
 * @param space - the class
 * @returns the facts, the states first and bold
 */
function useClassFacts(space: Space) {
  const { t } = useSpacesTranslation();
  // The teacher is a member of the class too; the board counts only pupils.
  const pupils = Math.max(space.memberCount - 1, 0);
  // A locked class says so first, so a pupil knows why nothing can be posted (CLASSES-b).
  const lockedFact = space.isLocked ? [{ text: t('pills.locked'), kind: 'state' as const }] : [];
  return [
    ...lockedFact,
    { text: t('classPage.private'), kind: 'state' as const },
    { text: t('classPage.onlyClass') },
    { text: t('classPage.pupils', { count: pupils }) },
    { text: t('classPage.teacher', { name: nameOf(space.owner, t('row.ownerDeleted')) }) },
  ];
}

/**
 * "Leave space" for a pupil, as a quiet text button (a class is joined with the teacher's code,
 * so there is nothing else to do with membership here).
 *
 * @returns the button and any failure, or nothing for someone who isn't a member
 */
function ClassLeaveButton({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const membership = useMembership(space.slug);
  const { membership: role } = space.viewer;
  if (role !== 'member' && role !== 'moderator') return null;
  return (
    <>
      <Button
        type="button"
        variant="text"
        disabled={membership.isRunning}
        onClick={() => void membership.leave().catch(errorShownByHook)}
      >
        {t('join.leave')}
      </Button>
      {membership.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(membership.failure))}</Notice>
      )}
    </>
  );
}

/**
 * Leave, the teacher's links and Report: the parts the board leaves out but the page needs.
 *
 * @returns the quiet row
 */
function ClassHeaderTools({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const isTeacher = space.viewer.membership === 'owner';
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <SpaceToolLinks space={space} />
      <ClassLeaveButton space={space} />
      {!isTeacher && (
        <ReportButton
          itemType="space"
          itemReference={space.id}
          itemLabel={t('space.reportLabel', { name: space.name })}
        />
      )}
    </div>
  );
}

/**
 * Renders the header.
 *
 * @param props.space - the class space
 * @returns the banner, the name, the meta line, the description and the actions
 */
export function ClassSpaceHeader({ space }: { space: Space }) {
  const facts = useClassFacts(space);
  const picture = useSpaceBannerView(space).data ?? null;
  // A picture still being checked, waiting for a person or removed shows the colour instead.
  const pictureUrl = picture !== null && picture.state === 'visible' ? picture.url : null;
  const canShare = space.viewer.canPost && !space.isLocked;
  return (
    <header className="flex flex-col gap-12">
      <div className="relative aspect-[7/1] w-full overflow-hidden rounded-card" aria-hidden="true">
        <SpaceBannerBand banner={space.banner} pictureUrl={pictureUrl} />
      </div>
      <div className="flex flex-col gap-3">
        <h1 id="space-title" className="page-title m-0 break-words">
          {space.name}
        </h1>
        <MetaLine facts={facts} />
        {space.description !== '' && (
          <p className="m-0 max-w-[34em] type-body break-words text-ink-muted">
            {space.description}
          </p>
        )}
        <div className="flex flex-col gap-6 pt-3">
          {canShare && <ShareClassStory classSlug={space.slug} />}
          <ClassHeaderTools space={space} />
        </div>
      </div>
    </header>
  );
}
