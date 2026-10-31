/**
 * TeachersList: everyone with the Teacher badge, each with "Remove badge" (story S1-E2-11,
 * criterion 7; board AdminSchools 8.9).
 *
 * Who shows it: TeacherChecksPage. What it calls: onRemove(handle, reason) →
 * useTeacherChecks → admin_remove_teacher_badge(), which logs the change and tells the teacher
 * the reason. Plain staff component, no doodles.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ReasonForm } from '@/features/moderation/components/ReasonForm';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { Teacher } from '../../api/teacherChecks';

/** What the list needs. */
export interface TeachersListProps {
  teachers: Teacher[];
  isBusy: boolean;
  onRemove: (handle: string, reason: string) => Promise<unknown>;
}

/**
 * One teacher: the name, the username, since when, and the remove button or its reason form.
 *
 * @returns the list item
 */
function TeacherRow({
  teacher,
  isBusy,
  onRemove,
}: {
  teacher: Teacher;
  isBusy: boolean;
  onRemove: TeachersListProps['onRemove'];
}) {
  const { t, i18n } = useTranslation('staff');
  const [isRemoving, setIsRemoving] = useState(false);
  const handle = teacher.handle ?? '';
  const since = formatRomaniaDateTime(new Date(teacher.badgeSince), i18n.language);
  return (
    <li className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-heading">{teacher.displayName}</span>
          <span className="text-sm text-meta">
            {t('teacherChecks.teacherSince', { handle, since })}
          </span>
        </div>
        {!isRemoving && handle !== '' && (
          <Button variant="secondary" disabled={isBusy} onClick={() => setIsRemoving(true)}>
            {t('teacherChecks.removeBadge')}
          </Button>
        )}
      </div>
      {isRemoving && (
        <ReasonForm
          id={`teacher-remove-${handle}`}
          label={t('teacherChecks.removeReason')}
          hint={t('teacherChecks.reasonHint')}
          confirmLabel={t('teacherChecks.removeBadge')}
          isBusy={isBusy}
          onConfirm={(reason) => onRemove(handle, reason)}
          onCancel={() => setIsRemoving(false)}
        />
      )}
    </li>
  );
}

/**
 * Renders the teachers.
 *
 * @returns the section
 */
export function TeachersList({ teachers, isBusy, onRemove }: TeachersListProps) {
  const { t } = useTranslation('staff');
  return (
    <section aria-labelledby="teachers-heading" className="flex flex-col gap-2">
      <h2 id="teachers-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('teacherChecks.teachersHeading')}
      </h2>
      {teachers.length === 0 ? (
        <p className="m-0 text-body">{t('teacherChecks.noTeachers')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {teachers.map((teacher) => (
            <TeacherRow
              key={teacher.handle ?? teacher.badgeSince}
              teacher={teacher}
              isBusy={isBusy}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
