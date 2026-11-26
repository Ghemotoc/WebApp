/**
 * ClassJoinTeacherLine: the line for teachers under "Join a class" (bundle BOOKS-8; board
 * G01-ClassJoin, user story 8.1: "Teaching a class? Create a class space with a Teacher badge.").
 *
 * Who shows it: JoinClassPage, under the code form.
 * What it shows: for a teacher who holds the badge, a link straight to a new class space
 * (/spaces/new?kind=class, where the kind is already set to a class); for everyone else, a link to
 * the Teacher badge in Settings (/settings#teacher-badge), because a class space needs the badge
 * (S1-E2-11, S1-E8-11). A signed-out visitor is sent to sign in by the settings route first.
 * What it calls: useMyTeacherCheck → my_teacher_check().
 */
import { Trans } from 'react-i18next';
import { Link } from 'react-router';

import { useMyTeacherCheck } from '@/features/teacher-badge/hooks/useMyTeacherCheck';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/** Where a teacher with the badge starts a class space. */
export const newClassSpaceAddress = '/spaces/new?kind=class';

/** Where anyone else reads about the Teacher badge and asks for it. */
const teacherBadgeAddress = '/settings#teacher-badge';

/**
 * Renders the line.
 *
 * @returns one paragraph with one link
 */
export function ClassJoinTeacherLine() {
  const { t } = useSpacesTranslation();
  const { teacherCheck } = useMyTeacherCheck();
  // Step 1: only a badge holder can start a class, so only they get the direct link.
  const isTeacher = teacherCheck?.isTeacher === true;
  const address = isTeacher ? newClassSpaceAddress : teacherBadgeAddress;
  const key = isTeacher ? 'joinClass.teacherLine' : 'joinClass.teacherLineBadge';
  return (
    <p className="m-0 type-body text-ink">
      <Trans
        t={t}
        i18nKey={key}
        components={{ create: <Link to={address} className="text-link underline" /> }}
      />
    </p>
  );
}
