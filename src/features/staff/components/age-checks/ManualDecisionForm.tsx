/**
 * ManualDecisionForm: the decision on one manual age check: the outcome, then the reason the
 * person will read (story S1-E2-08, part 08b; criterion 8).
 *
 * Who shows it: ManualAgeCheckCard. What it calls: onDecide(decision, reason), which
 * useManualAgeChecks sends to admin_decide_manual_age_check(). How staff verify an age by hand is
 * OPEN (story S1-E2-08), so the form records only the outcome and the reason.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { ReasonForm } from '@/features/moderation/components/ReasonForm';

import type { ManualDecision } from '../../api/manualAgeChecks';

/** The decisions, in the order the drop-down lists them. */
const decisions: ManualDecision[] = ['passed_18', 'passed_13', 'refused'];

/** What the form needs. */
export interface ManualDecisionFormProps {
  requestId: string;
  isBusy: boolean;
  onDecide: (decision: ManualDecision, reason: string) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the form.
 *
 * @returns the outcome drop-down and the reason with its buttons
 */
export function ManualDecisionForm({
  requestId,
  isBusy,
  onDecide,
  onCancel,
}: ManualDecisionFormProps) {
  const { t } = useTranslation('staff');
  const [decision, setDecision] = useState<ManualDecision>('passed_18');

  return (
    <div className="flex flex-col gap-3">
      <Select
        id={`manual-decision-${requestId}`}
        label={t('manualChecks.decision')}
        isLabelVisible
        placement="form"
        value={decision}
        onChange={(value) => setDecision(decisions.find((choice) => choice === value) ?? 'refused')}
        options={decisions.map((choice) => ({
          value: choice,
          label: t(`manualChecks.decisions.${choice}`),
        }))}
      />
      <ReasonForm
        id={`manual-reason-${requestId}`}
        label={t('manualChecks.reason')}
        hint={t('manualChecks.reasonHint')}
        confirmLabel={t('manualChecks.save')}
        isBusy={isBusy}
        onConfirm={(reason) => onDecide(decision, reason)}
        onCancel={onCancel}
      />
    </div>
  );
}
