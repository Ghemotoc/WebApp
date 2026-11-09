/**
 * TeacherConfirmSteps: "What happens next" once a school address is confirmed and a moderator
 * still has to check it (bundle G8e; board TeacherConfirm; story S1-E2-11, criterion 3).
 *
 * Three steps in a glass list with a fine line between rows (DoD, label rows): the address is
 * confirmed (done), a moderator checks it (next), then the Teacher badge shows on the profile.
 * The tick or the step's number is decoration; each step's words say where it stands.
 * Who uses it: TeacherConfirmPage, only for the waiting_for_staff outcome.
 */
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';

/** The three steps, in order, by their keys under teacherBadge.confirm.steps. */
const stepKeys = ['confirmed', 'check', 'badge'] as const;

/**
 * Renders the list.
 *
 * @returns the heading and the three steps
 */
export function TeacherConfirmSteps() {
  const { t } = useTranslation('account');
  return (
    <div className="flex flex-col gap-2">
      <h2 className="m-0 font-heading text-lg font-bold text-heading">
        {t('teacherBadge.confirm.nextHeading')}
      </h2>
      <ol className="m-0 list-none divide-y divide-border rounded-[20px] border border-border bg-surface p-0">
        {stepKeys.map((key, index) => (
          <li key={key} className="flex items-center gap-3 px-4 py-3">
            {/* Step 1 is done, so it carries a tick; the others carry their number. */}
            <span
              aria-hidden="true"
              className="flex size-8 flex-none items-center justify-center rounded-full border border-border bg-surface-solid text-sm font-bold text-heading"
            >
              {index === 0 ? <ActionIcon name="check" size={16} /> : index + 1}
            </span>
            <span className="flex flex-col">
              <span className="font-semibold text-heading">
                {t(`teacherBadge.confirm.steps.${key}Title`)}
              </span>
              <span className="text-sm text-body">
                {t(`teacherBadge.confirm.steps.${key}Note`)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
