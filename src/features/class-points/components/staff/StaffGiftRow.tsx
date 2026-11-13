/**
 * StaffGiftRow: one gift of class points in a flag's table, with who gave it and the way to
 * remove it (bundle CLASS-POINTS, part 1; story S1-E8-16 criterion 2).
 *
 * Removing needs a reason, typed in the row; the database refuses an empty one, writes the
 * class's log (the reason, never the giver) and the audit log (with the giver). While the week
 * is still open the giver has those points back. Plain staff components, no doodles.
 * Who shows it: StaffFlagCard. What it calls: the moderation hook's remove().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { ClassGift } from '../../api/classPointsStaff';
import { useClassPointsTranslation } from '../../registerClassPointsTranslations';

/** What the row needs. */
export interface StaffGiftRowProps {
  gift: ClassGift;
  /** False for staff who may only look. The database decides again. */
  isRunning: boolean;
  onRemove: (reason: string) => void;
}

/** The table cells' shared classes. */
const cellClasses = 'border-t border-border px-2 py-2 align-top text-sm text-body';

/**
 * Renders the row.
 *
 * @returns the table row
 */
export function StaffGiftRow({ gift, isRunning, onRemove }: StaffGiftRowProps) {
  const { t, i18n } = useClassPointsTranslation();
  const [reason, setReason] = useState('');
  const week = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeZone: 'UTC' });
  return (
    <tr>
      <td className={cellClasses}>{week.format(new Date(`${gift.weekStart}T12:00:00Z`))}</td>
      <td className={cellClasses}>@{gift.giverHandle}</td>
      <td className={cellClasses}>@{gift.receiverHandle}</td>
      <td className={`${cellClasses} [overflow-wrap:anywhere]`}>
        {t('table.chapterLine', { story: gift.storyTitle, number: gift.chapterPosition })}
      </td>
      <td className={`${cellClasses} text-right`}>{gift.points}</td>
      <td className={`${cellClasses} [overflow-wrap:anywhere]`}>{gift.note ?? ''}</td>
      <td className={cellClasses}>
        {gift.isRemoved ? (
          t('staff.removed', { reason: gift.removedReason ?? '' })
        ) : (
          <div className="flex min-w-[220px] flex-col gap-2">
            <TextInput
              id={`gift-reason-${gift.id}`}
              label={t('staff.reasonLabel')}
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
            <Button
              variant="secondary"
              className="self-start"
              disabled={isRunning || reason.trim() === ''}
              aria-label={t('staff.removeFor', { handle: gift.giverHandle })}
              onClick={() => onRemove(reason)}
            >
              {t('staff.remove')}
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
