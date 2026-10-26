/**
 * OnCallShiftList: the on-call shifts that haven't ended, with Remove for owners and admins, and
 * the gaps in the next 14 days when nobody is on call (story S1-E10-09; Regulation (EU) 2021/784
 * art. 3(3): an order can arrive at any hour and needs someone within the hour).
 *
 * Who shows it: OnCallRotaPage. What it calls: the remove() it is given (useOnCallRota).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { OnCallRota, OnCallShift } from '../api/removalOrders';
import type { useOnCallRota } from '../hooks/useOnCallRota';

import { ReasonForm } from './ReasonForm';

/**
 * A time in Romania time.
 *
 * @returns a function from an ISO time to the text
 */
function useRotaTime() {
  const { i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Bucharest',
  });
  return (isoTime: string) => format.format(new Date(isoTime));
}

/**
 * One shift, with Remove when the person may edit.
 *
 * @returns a list item
 */
function ShiftRow({
  shift,
  canEdit,
  rota,
}: {
  shift: OnCallShift;
  canEdit: boolean;
  rota: ReturnType<typeof useOnCallRota>;
}) {
  const { t } = useTranslation('moderation');
  const timeOf = useRotaTime();
  const [isRemoving, setIsRemoving] = useState(false);
  return (
    <li className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0">
      <p className="m-0 text-body">
        <span className="font-semibold text-heading">@{shift.handle}</span>{' '}
        {t('onCall.shiftTimes', { from: timeOf(shift.startsAt), to: timeOf(shift.endsAt) })}
        {shift.isNow && <span className="ml-2 text-sm text-meta">{t('onCall.now')}</span>}
      </p>
      {canEdit && !isRemoving && (
        <div>
          <Button
            variant="secondary"
            aria-label={t('onCall.removeLabel', { handle: shift.handle })}
            onClick={() => setIsRemoving(true)}
          >
            {t('onCall.remove')}
          </Button>
        </div>
      )}
      {isRemoving && (
        <ReasonForm
          id={`remove-shift-${shift.id}`}
          label={t('onCall.removeReason')}
          confirmLabel={t('onCall.removeConfirm')}
          isBusy={false}
          onConfirm={async (reason) => {
            await rota.remove(shift.id, reason);
            setIsRemoving(false);
          }}
          onCancel={() => setIsRemoving(false)}
        />
      )}
    </li>
  );
}

/**
 * Renders the shifts and the gaps.
 *
 * @returns the two sections
 */
export function OnCallShiftList({
  rotaData,
  rota,
}: {
  rotaData: OnCallRota;
  rota: ReturnType<typeof useOnCallRota>;
}) {
  const { t } = useTranslation('moderation');
  const timeOf = useRotaTime();
  return (
    <>
      <section aria-labelledby="on-call-shifts-heading" className="flex flex-col gap-2">
        <h2 id="on-call-shifts-heading" className="m-0 font-heading text-xl font-bold text-heading">
          {t('onCall.shiftsHeading')}
        </h2>
        {rota.removeFailure !== null && (
          <Notice tone="error">{t(`failures.${rota.removeFailure}`)}</Notice>
        )}
        {rotaData.shifts.length === 0 && <p className="m-0 text-body">{t('onCall.noShifts')}</p>}
        <ul className="m-0 list-none p-0">
          {rotaData.shifts.map((shift) => (
            <ShiftRow key={shift.id} shift={shift} canEdit={rotaData.canEdit} rota={rota} />
          ))}
        </ul>
      </section>
      <section aria-labelledby="on-call-gaps-heading" className="flex flex-col gap-2">
        <h2 id="on-call-gaps-heading" className="m-0 font-heading text-xl font-bold text-heading">
          {t('onCall.gapsHeading')}
        </h2>
        {rotaData.gaps.length === 0 ? (
          <p className="m-0 text-body">{t('onCall.noGaps')}</p>
        ) : (
          <ul className="m-0 flex flex-col gap-1 pl-5 text-body">
            {rotaData.gaps.map((gap) => (
              <li key={gap.startsAt}>
                {t('onCall.gap', { from: timeOf(gap.startsAt), to: timeOf(gap.endsAt) })}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
