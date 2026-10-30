/**
 * CaseRow: one case on the queue (story S1-E10-03a; board 8.2's table: case, what was reported,
 * signals, account, deadline).
 *
 * One card per case at every width (a six-column table doesn't fit a phone, and cards read well
 * everywhere): the reference is the link to the case page, then what was reported, the signals,
 * the account by username and age group (never the year of birth, architecture 1.8.3) and the
 * deadline. A decided case shows its decision instead of a countdown. A claimed case says who
 * has it (S1-E10-03b).
 * Who shows it: CaseList.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { LabelRows } from '@/components/ui/LabelRows';

import type { QueueCase } from '../api/moderationQueue';

import { CaseSignals } from './CaseSignals';
import { DeadlineLabel } from './DeadlineLabel';
import { TierPill } from './TierPill';

/**
 * What was reported: the reason (or the source for an order or a picture) and the item.
 *
 * @param theCase - the case
 * @param t - the moderation translator
 * @returns the heading words
 */
function reasonText(theCase: QueueCase, t: TFunction<'moderation'>): string {
  if (theCase.source !== 'report') return t(`sources.${theCase.source}`);
  return theCase.topReason === null ? t('reasons.none') : t(`reasons.${theCase.topReason}`);
}

/**
 * Renders the card.
 *
 * @param props.theCase - the case
 * @returns a list item
 */
export function CaseRow({ theCase }: { theCase: QueueCase }) {
  const { t } = useTranslation('moderation');
  const account =
    theCase.reportedHandle === null
      ? t('case.noHandle')
      : t('case.reportedAccount', {
          handle: theCase.reportedHandle,
          ageBand: t(`ageBands.${theCase.reportedAgeBand}`),
        });
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/staff/moderation/cases/${theCase.id}`}
          aria-label={t('queue.open', { reference: theCase.reference })}
          className="font-heading text-lg font-bold text-link underline"
        >
          {theCase.reference}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <TierPill tier={theCase.tier} />
          <DeadlineLabel theCase={theCase} />
          {theCase.claimedByHandle !== null && (
            <InfoPill tone="sky">
              {theCase.claimedByMe
                ? t('claims.pillMine')
                : t('claims.pill', { handle: theCase.claimedByHandle })}
            </InfoPill>
          )}
        </div>
      </div>
      <LabelRows
        rows={[
          {
            label: t('queue.columns.what'),
            value: (
              <span>
                <span className="font-semibold text-heading">{reasonText(theCase, t)}</span>
                <span className="block text-sm text-body">{theCase.itemSummary}</span>
              </span>
            ),
          },
          { label: t('queue.columns.signals'), value: <CaseSignals theCase={theCase} /> },
          { label: t('queue.columns.user'), value: account },
          ...(theCase.decision === null
            ? []
            : [{ label: t('queue.columns.decision'), value: t(`actions.${theCase.decision}`) }]),
        ]}
      />
    </li>
  );
}
