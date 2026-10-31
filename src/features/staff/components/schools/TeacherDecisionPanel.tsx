/**
 * TeacherDecisionPanel: "Approve teacher" or "Not yet", each with the reason the person will read
 * (story S1-E2-11, criterion 5; board AdminSchools 8.9).
 *
 * Who shows it: TeacherCheckCard. What it calls: onDecide(decision, reason), which the card turns
 * into a decision (the proof is deleted first). How staff confirm a school that isn't .edu.ro is
 * OPEN (story S1-E2-11), so the form records only the outcome and the reason.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ReasonForm } from '@/features/moderation/components/ReasonForm';

import type { TeacherDecision } from '../../api/teacherChecks';

/** What the panel needs. */
export interface TeacherDecisionPanelProps {
  checkId: string;
  isBusy: boolean;
  /** False until a proof is opened, so nobody decides on a file they haven't seen. */
  canDecide: boolean;
  onDecide: (decision: TeacherDecision, reason: string) => Promise<unknown>;
}

/**
 * Renders the two buttons, or the reason form for the one pressed.
 *
 * @returns the panel
 */
export function TeacherDecisionPanel({
  checkId,
  isBusy,
  canDecide,
  onDecide,
}: TeacherDecisionPanelProps) {
  const { t } = useTranslation('staff');
  const [decision, setDecision] = useState<TeacherDecision | null>(null);
  if (decision !== null) {
    return (
      <ReasonForm
        id={`teacher-reason-${checkId}`}
        label={t(`teacherChecks.reasonLabel.${decision}`)}
        hint={t('teacherChecks.reasonHint')}
        confirmLabel={t(`teacherChecks.confirm.${decision}`)}
        isBusy={isBusy}
        onConfirm={(reason) => onDecide(decision, reason)}
        onCancel={() => setDecision(null)}
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-2.5">
      <Button disabled={!canDecide || isBusy} onClick={() => setDecision('approved')}>
        {t('teacherChecks.approve')}
      </Button>
      <Button
        variant="secondary"
        disabled={!canDecide || isBusy}
        onClick={() => setDecision('rejected')}
      >
        {t('teacherChecks.notYet')}
      </Button>
    </div>
  );
}
