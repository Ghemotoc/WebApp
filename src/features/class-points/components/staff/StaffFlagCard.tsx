/**
 * StaffFlagCard: one open class points flag for our moderation team (bundle CLASS-POINTS, part 1;
 * story S1-E8-16 criteria 2 to 4).
 *
 * What it shows: what the flag is (a teacher's report about a chapter, or two pupils who gave
 * each other most of their points three weeks running), the class, the teacher's line, "Show
 * gifts" (which reads who gave the points and is written to the audit log), the gifts with
 * "Remove gift", and "Close flag". Plain staff components, no doodles.
 * Who shows it: StaffClassPointsPage. What it calls: useClassGifts → admin_class_gifts();
 * useClassPointsModeration → admin_remove_class_gift() and admin_close_class_point_flag().
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import type { ClassPointFlag } from '../../api/classPointsStaff';
import { useClassGifts, useClassPointsModeration } from '../../hooks/useClassPointsStaff';
import { useClassPointsTranslation } from '../../registerClassPointsTranslations';

import { StaffGiftRow } from './StaffGiftRow';

/** The gift table's column headings, in order. */
const giftColumns = ['week', 'giver', 'receiver', 'chapter', 'points', 'note', 'action'] as const;

/** The moderation calls, as the hook gives them. */
type Moderation = ReturnType<typeof useClassPointsModeration>;

/**
 * The gifts behind the flag, once the moderator asked for them.
 *
 * @returns the table, or a line when there are none
 */
function FlagGifts({ flag, moderation }: { flag: ClassPointFlag; moderation: Moderation }) {
  const { t } = useClassPointsTranslation();
  const read = useClassGifts(flag, true);
  if (read.isError) return <Notice tone="error">{t('staff.failures.unreachable')}</Notice>;
  if (read.data === undefined) return null;
  if (read.data.length === 0) return <p className="m-0 text-body">{t('staff.noGifts')}</p>;
  return (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label={t('staff.giftsCaption')}
    >
      <table className="w-full min-w-[760px] border-collapse">
        <caption className="sr-only">{t('staff.giftsCaption')}</caption>
        <thead>
          <tr>
            {giftColumns.map((column) => (
              <th key={column} scope="col" className="px-2 pb-2 text-left text-sm text-ink">
                {t(`staff.columns.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {read.data.map((gift) => (
            <StaffGiftRow
              key={gift.id}
              gift={gift}
              isRunning={moderation.isRunning}
              onRemove={(reason) => {
                // The failure shows under the card; nothing more to do here when it is refused.
                moderation.remove({ giftId: gift.id, reason }).catch(() => undefined);
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * What the flag is about, in one line.
 *
 * @returns the line
 */
function FlagSubject({ flag }: { flag: ClassPointFlag }) {
  const { t } = useClassPointsTranslation();
  if (flag.chapter !== null) {
    return (
      <p className="m-0 text-body [overflow-wrap:anywhere]">
        {t('staff.flagChapter', {
          story: flag.chapter.storyTitle,
          number: flag.chapter.position,
          handle: flag.chapter.writerHandle,
        })}
      </p>
    );
  }
  if (flag.pair === null) return null;
  return (
    <p className="m-0 text-body">
      {t('staff.flagPair', { first: flag.pair[0], second: flag.pair[1] })}
    </p>
  );
}

/**
 * Renders the card.
 *
 * @param props.flag - the open flag
 * @returns the list item
 */
export function StaffFlagCard({ flag }: { flag: ClassPointFlag }) {
  const { t } = useClassPointsTranslation();
  const moderation = useClassPointsModeration();
  const [isOpen, setIsOpen] = useState(false);
  const regionId = useId();
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <InfoPill tone={flag.kind === 'pair' ? 'gold' : 'sky'}>
          {t(`staff.kind.${flag.kind}`)}
        </InfoPill>
        <span className="text-sm text-body">{t('staff.flagClass', { name: flag.className })}</span>
      </div>
      <FlagSubject flag={flag} />
      {flag.note !== null && (
        <p className="m-0 text-body [overflow-wrap:anywhere]">
          {t('staff.flagNote', { note: flag.note })}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          aria-expanded={isOpen}
          aria-controls={regionId}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? t('staff.hideGifts') : t('staff.showGifts')}
        </Button>
        <Button
          variant="secondary"
          disabled={moderation.isRunning}
          onClick={() => {
            moderation.close(flag.id).catch(() => undefined);
          }}
        >
          {t('staff.close')}
        </Button>
      </div>
      <div id={regionId} hidden={!isOpen}>
        {isOpen && <FlagGifts flag={flag} moderation={moderation} />}
      </div>
      <div aria-live="polite">
        {moderation.failure !== null && (
          <Notice tone="error">{t(`staff.failures.${moderation.failure.failure}`)}</Notice>
        )}
      </div>
    </li>
  );
}
