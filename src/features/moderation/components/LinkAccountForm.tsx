/**
 * LinkAccountForm: "Link another account" on a possible returning user case: the other account's
 * username and the moderator's reason (bundle ADMIN-2, part f2; Robert's brief of 2 Nov 2026,
 * section 6: a moderator can link two accounts they believe are the same person).
 *
 * Who shows it: CaseAccountLinks. What it calls: the onLink it is given, which asks
 * admin_link_returning_user() (the database checks the username, refuses the case's own account
 * and a link that already exists, and writes the audit log).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

/** What the form needs. */
export interface LinkAccountFormProps {
  /** The case, so the field ids are unique on the page. */
  caseId: string;
  isBusy: boolean;
  /** Asks the database; a refusal is shown by the parent. */
  onLink: (handle: string, reason: string) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the two fields and the buttons.
 *
 * @returns the inline form
 */
export function LinkAccountForm({ caseId, isBusy, onLink, onCancel }: LinkAccountFormProps) {
  const { t } = useTranslation('moderation');
  const [handle, setHandle] = useState('');
  const [reason, setReason] = useState('');
  const [handleProblem, setHandleProblem] = useState<string | null>(null);
  const [reasonProblem, setReasonProblem] = useState<string | null>(null);

  /** Needs both fields, then asks the database. */
  async function confirm() {
    // Step 1: say what is missing next to each empty field.
    const cleanHandle = handle.trim().replace(/^@/, '');
    setHandleProblem(cleanHandle === '' ? t('accountLinks.handleMissing') : null);
    setReasonProblem(reason.trim() === '' ? t('reason.missing') : null);
    if (cleanHandle === '' || reason.trim() === '') return;
    // Step 2: link; clear the fields only when the database kept it.
    const linked = await onLink(cleanHandle, reason.trim()).then(
      () => true,
      () => false,
    );
    if (linked) {
      setHandle('');
      setReason('');
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <TextInput
        id={`link-handle-${caseId}`}
        label={t('accountLinks.handleLabel')}
        hint={t('accountLinks.handleHint')}
        errorMessage={handleProblem ?? undefined}
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
      />
      <TextInput
        id={`link-reason-${caseId}`}
        label={t('accountLinks.reasonLabel')}
        hint={t('reason.hint')}
        errorMessage={reasonProblem ?? undefined}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={isBusy} onClick={() => void confirm()}>
          {t('accountLinks.linkConfirm')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('reason.cancel')}
        </Button>
      </div>
    </div>
  );
}
