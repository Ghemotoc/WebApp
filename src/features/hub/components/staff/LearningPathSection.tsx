/**
 * LearningPathSection: "Learning path" on the Writers' hub staff page: the seven days, each with
 * Edit (bundle GAPS-12g). The path always has seven days, so there is no Add or Delete; every
 * change is in the audit log.
 *
 * Who shows it: StaffHubPage. What it calls: useLearningPath (the same seven days writers read),
 * useStaffLearningPath and LearningStepForm.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';

import type { LearningStep } from '../../api/hubPath';
import { useLearningPath } from '../../hooks/useLearningPath';
import { useStaffLearningPath } from '../../hooks/useStaffLearningPath';
import { useHubTranslation } from '../../registerHubTranslations';

import { LearningStepForm } from './LearningStepForm';

/** What one day's item needs. */
interface StepItemProps {
  step: LearningStep;
  staff: ReturnType<typeof useStaffLearningPath>;
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
}

/**
 * One day: its number, English title and task with Edit, or the form while it is being changed.
 *
 * @returns the list item
 */
function StepItem({ step, staff, isEditing, onEdit, onDone }: StepItemProps) {
  const { t } = useHubTranslation();
  return (
    <li>
      <Card className="flex flex-col gap-3 p-5">
        <p className="m-0 text-sm text-meta">{t('hub.path.dayNumber', { day: step.day })}</p>
        {isEditing ? (
          <LearningStepForm
            step={step}
            isBusy={staff.isChanging}
            onSave={async (texts) => staff.save.mutateAsync({ day: step.day, texts }).then(onDone)}
            onCancel={onDone}
          />
        ) : (
          <>
            <p lang="en" className="m-0 font-semibold break-words text-heading">
              {step.titleEn}
            </p>
            <p lang="en" className="m-0 text-sm break-words text-body">
              {step.taskEn}
            </p>
            <Button
              variant="secondary"
              className="w-fit"
              aria-label={t('hubStaff.editNamed', { name: step.titleEn })}
              onClick={onEdit}
            >
              {t('hubStaff.edit')}
            </Button>
          </>
        )}
      </Card>
    </li>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading, any refusal and the seven days
 */
export function LearningPathSection() {
  const { t } = useHubTranslation();
  const path = useLearningPath();
  const staff = useStaffLearningPath();
  // Which day is open for changing, or null.
  const [editingDay, setEditingDay] = useState<number | null>(null);
  // A refused value gets this section's own words; the other refusals are shared.
  const failureKey =
    staff.changeFailure === 'refused'
      ? 'hubStaff.path.refused'
      : `hubStaff.failures.${staff.changeFailure ?? 'failed'}`;
  return (
    <section aria-labelledby="staff-hub-path" className="flex max-w-[720px] flex-col gap-4">
      <h2 id="staff-hub-path" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('hubStaff.path.heading')}
      </h2>
      <p className="m-0 text-body">{t('hubStaff.path.intro')}</p>
      <div aria-live="polite">
        {staff.changeFailure !== null && <Notice tone="error">{t(failureKey)}</Notice>}
      </div>
      {path.loadFailed && <Notice tone="error">{t('hubStaff.loadFailed')}</Notice>}
      {!path.isLoaded && !path.loadFailed && (
        <p className="m-0 text-meta">{t('hubStaff.loading')}</p>
      )}
      <ol
        className="m-0 flex list-none flex-col gap-3 p-0"
        aria-label={t('hubStaff.path.listLabel')}
      >
        {path.steps.map((step) => (
          <StepItem
            key={step.day}
            step={step}
            staff={staff}
            isEditing={editingDay === step.day}
            onEdit={() => setEditingDay(step.day)}
            onDone={() => setEditingDay(null)}
          />
        ))}
      </ol>
    </section>
  );
}
