/**
 * ModeratedItemNotice: on a decided case, what happened to the item (hidden or removed) and
 * "Restore" with a reason (story S1-E10-06; architecture 1.8.5: every change can be restored).
 *
 * Who shows it: CasePage. What it calls: useSanctions.restore().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { useSanctions } from '../hooks/useSanctions';

import { ReasonForm } from './ReasonForm';

/**
 * Renders the notice, or nothing when the case touched no item.
 *
 * @param props.sanctions - useSanctions's result (it holds the case's moderated item)
 * @returns the notice with the restore action
 */
export function ModeratedItemNotice({ sanctions }: { sanctions: ReturnType<typeof useSanctions> }) {
  const { t } = useTranslation('moderation');
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const item = sanctions.moderatedItem;
  if (item === null) return null;
  if (item.restoredAt !== null) {
    return <Notice tone="info">{t('moderatedItem.restored')}</Notice>;
  }
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <p className="m-0 font-semibold text-heading">{t(`moderatedItem.${item.state}`)}</p>
      <p className="m-0 text-sm text-body">{t('moderatedItem.explain')}</p>
      {sanctions.restoreFailure !== null && (
        <Notice tone="error">{t(`failures.${sanctions.restoreFailure}`)}</Notice>
      )}
      {!isRestoreOpen && (
        <div>
          <Button variant="secondary" onClick={() => setIsRestoreOpen(true)}>
            {t('moderatedItem.restore')}
          </Button>
        </div>
      )}
      {isRestoreOpen && (
        <ReasonForm
          id={`restore-${item.id}`}
          label={t('moderatedItem.restoreReason')}
          confirmLabel={t('moderatedItem.restoreConfirm')}
          isBusy={sanctions.isBusy}
          onConfirm={(reason) => sanctions.restore(item.id, reason)}
          onCancel={() => setIsRestoreOpen(false)}
        />
      )}
    </div>
  );
}
