/**
 * ClassTeacherActions: the teacher's buttons under the class's name (bundle BOOKS-8, part 8b;
 * board G08-ClassTeacher, user story 8.8).
 *
 * What it shows: "New thread" (the main button: homework and news go to the class as threads),
 * "Invite pupils" (quiet; opens the code and link in class settings) and "Class settings" with
 * the settings icon as a text button. "Class log" follows as a text button: the board has no
 * place for it, and the teacher reads the class's log there (S1-E8-07).
 * Who shows it: ClassSpaceHeader, for the class's teacher. What it calls: nothing; each page and
 * the database check again (architecture 1.8.1).
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the row.
 *
 * @param props.space - the class
 * @returns the buttons, left-aligned with the main one first (DoD)
 */
export function ClassTeacherActions({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const base = `/spaces/${space.slug}`;
  const canPost = space.viewer.canPost && !space.isLocked;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {canPost && (
        <Link to={`${base}/new`} className={buttonClassName()}>
          {t('classPage.newThread')}
        </Link>
      )}
      {!space.isLocked && (
        <Link
          to={`${base}/settings#class-invite-heading`}
          className={buttonClassName({ variant: 'secondary' })}
        >
          {t('classPage.invitePupils')}
        </Link>
      )}
      <Link to={`${base}/settings`} className={buttonClassName({ variant: 'text' }, 'ml-3')}>
        <ActionIcon name="settings" />
        {t('classPage.classSettings')}
      </Link>
      <Link to={`${base}/log`} className={buttonClassName({ variant: 'text' }, 'ml-3')}>
        {t('classPage.classLog')}
      </Link>
    </div>
  );
}
