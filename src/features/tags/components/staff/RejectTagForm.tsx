/**
 * RejectTagForm: the reason and "Reject the tag", opened from a tag's Reject button (CMS-1e).
 * The reason goes to the audit log; writers only hear that the tag wasn't approved.
 * Who shows it: TagDecisionRow. What it calls: nothing; the row passes the reject action.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

/** What the form needs. */
interface RejectTagFormProps {
  tagId: string;
  /** The database's word when the reason was refused ("empty"), or null. */
  reasonProblem: string | null;
  isBusy: boolean;
  onReject: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Renders the form.
 *
 * @returns the reason field and its buttons
 */
export function RejectTagForm({
  tagId,
  reasonProblem,
  isBusy,
  onReject,
  onCancel,
}: RejectTagFormProps) {
  const { t } = useTranslation('tagsAdmin');
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-hairline p-4">
      <Textarea
        id={`reject-${tagId}`}
        label={t('reason')}
        hint={t('reasonHint')}
        value={reason}
        maxLength={300}
        rows={2}
        onChange={(event) => setReason(event.target.value)}
      />
      {reasonProblem !== null && (
        <p className="m-0 text-sm text-destructive">{t(`problems.${reasonProblem}`)}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" disabled={isBusy} onClick={() => onReject(reason)}>
          {t('confirmReject')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
