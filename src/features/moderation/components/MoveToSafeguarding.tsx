/**
 * MoveToSafeguarding: "Move to safeguarding" on an open case that isn't there yet, for when a
 * report filed under another reason is really about a child at risk (story S1-E10-10;
 * criterion 3).
 *
 * After the move only staff with the safeguarding permission see the case; a moderator without it
 * is told so, and the page then says there is no case here for them.
 * Who shows it: CasePage. What it calls: useMoveToSafeguarding.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useMoveToSafeguarding } from '../hooks/useSafeguarding';

import { ReasonForm } from './ReasonForm';

/**
 * Renders the button, then the reason form.
 *
 * @param props.caseId - the case
 * @returns the block
 */
export function MoveToSafeguarding({ caseId }: { caseId: string }) {
  const { t } = useTranslation('moderation');
  const { move, isMoving, hasMoved, moveFailure } = useMoveToSafeguarding(caseId);
  const [isAsking, setIsAsking] = useState(false);
  if (hasMoved) return <Notice tone="success">{t('safeguarding.moved')}</Notice>;
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-body">{t('safeguarding.moveIntro')}</p>
      {moveFailure !== null && <Notice tone="error">{t(`failures.${moveFailure}`)}</Notice>}
      {isAsking ? (
        <ReasonForm
          id="move-safeguarding-reason"
          label={t('safeguarding.moveReason')}
          confirmLabel={t('safeguarding.moveConfirm')}
          isBusy={isMoving}
          onConfirm={async (reason) => move(reason)}
          onCancel={() => setIsAsking(false)}
        />
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setIsAsking(true)}>
            {t('safeguarding.move')}
          </Button>
        </div>
      )}
    </div>
  );
}
