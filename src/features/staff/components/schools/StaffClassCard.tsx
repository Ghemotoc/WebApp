/**
 * StaffClassCard: one class on Staff › Schools › Class spaces (bundle CLASSES, part d; story
 * S1-E8-11 criterion 10).
 *
 * What it shows: the class's name (a link to it), then label rows with a fine line between them
 * (DoD design rules): the school, the teacher, members and whether it is open, locked or
 * archived. Then "Change the school" and, until it is archived, the code and archive actions.
 * Plain components, no doodles. Never a user ID or a student's name.
 * Who shows it: ClassSpacesPage, one per class. What it calls: StaffClassSchoolForm and
 * StaffClassActions.
 */
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { lockDateText } from '@/features/spaces/api/classTools';

import type { StaffClassSpace } from '../../api/staffClassSpaces';

import { StaffClassActions } from './StaffClassActions';
import { StaffClassSchoolForm } from './StaffClassSchoolForm';

/**
 * The class's status in words: archived, locked, or open until its lock date.
 *
 * @param props.space - the class
 * @returns the text
 */
function StatusText({ space }: { space: StaffClassSpace }) {
  const { t, i18n } = useTranslation('staff');
  if (space.archivedAt !== null) {
    return (
      <>{t('classSpaces.archivedOn', { date: lockDateText(space.archivedAt, i18n.language) })}</>
    );
  }
  if (space.isLocked) return <>{t('classSpaces.locked')}</>;
  if (space.locksAt === null) return <>{t('classSpaces.open')}</>;
  return <>{t('classSpaces.openUntil', { date: lockDateText(space.locksAt, i18n.language) })}</>;
}

/** One label and its value, with the fine line under it. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border py-2 last:border-b-0">
      <dt className="min-w-[120px] text-sm font-semibold text-heading">{label}</dt>
      <dd className="m-0 text-sm text-body">{children}</dd>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the class
 * @returns the card, one list item
 */
export function StaffClassCard({ space }: { space: StaffClassSpace }) {
  const { t } = useTranslation('staff');
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <h3 className="m-0 font-heading text-xl font-bold text-heading">
        <Link to={`/spaces/${space.slug}`}>{space.name}</Link>
      </h3>
      <dl className="m-0 flex flex-col">
        <Row label={t('classSpaces.school')}>{space.schoolName ?? t('classSpaces.noSchool')}</Row>
        <Row label={t('classSpaces.teacher')}>
          <Link to={`/u/${space.teacherHandle}`}>{space.teacherName}</Link>
        </Row>
        <Row label={t('classSpaces.members')}>{space.memberCount}</Row>
        <Row label={t('classSpaces.status')}>
          <StatusText space={space} />
        </Row>
      </dl>
      {isEditingSchool ? (
        <StaffClassSchoolForm space={space} onDone={() => setIsEditingSchool(false)} />
      ) : (
        <Button variant="text" className="self-start" onClick={() => setIsEditingSchool(true)}>
          {t('classSpaces.changeSchool')}
        </Button>
      )}
      {space.archivedAt === null && <StaffClassActions space={space} />}
    </li>
  );
}
