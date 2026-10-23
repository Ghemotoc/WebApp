/**
 * ReasonForm: a small inline form with one required reason field and a confirm button, used
 * wherever a staff action needs a logged reason: lifting a sanction, pausing a reporter,
 * restoring an item (story S1-E10-06; the audit log needs a reason for every change).
 *
 * Who shows it: AccountSanctions, CaseReports, ModeratedItemNotice. What it calls: the
 * onConfirm it is given.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

/** What the form needs. */
export interface ReasonFormProps {
  /** A unique id for the field. */
  id: string;
  label: string;
  confirmLabel: string;
  isBusy: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the field and the two buttons.
 *
 * @returns the inline form
 */
export function ReasonForm({
  id,
  label,
  confirmLabel,
  isBusy,
  onConfirm,
  onCancel,
}: ReasonFormProps) {
  const { t } = useTranslation('moderation');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  /** Needs a reason, then asks the database; a refusal is shown by the parent. */
  async function confirm() {
    if (reason.trim() === '') return setProblem(t('reason.missing'));
    setProblem(null);
    await onConfirm(reason.trim()).catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <TextInput
        id={id}
        label={label}
        hint={t('reason.hint')}
        errorMessage={problem ?? undefined}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" disabled={isBusy} onClick={() => void confirm()}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('reason.cancel')}
        </Button>
      </div>
    </div>
  );
}
