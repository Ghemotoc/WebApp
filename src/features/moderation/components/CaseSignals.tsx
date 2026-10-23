/**
 * CaseSignals: the small facts beside a case: how many reports, whether a reporter is under 18,
 * safeguarding, an authority order or a held picture (story S1-E10-03a; board 8.2's Signals
 * column).
 *
 * Who shows it: CaseRow and CasePage. Pills carry words, never colour alone (Definition of Done).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import type { QueueCase } from '../api/moderationQueue';

/**
 * Renders the signals.
 *
 * @param props.theCase - the case
 * @returns the report count line and the pills that apply
 */
export function CaseSignals({ theCase }: { theCase: QueueCase }) {
  const { t } = useTranslation('moderation');
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-body">
        {theCase.source === 'report'
          ? t('signals.reports', { count: theCase.reportCount })
          : t('signals.noReports')}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {theCase.source === 'authority_order' && (
          <InfoPill tone="blush">{t('signals.authorityOrder')}</InfoPill>
        )}
        {theCase.source === 'picture_check' && (
          <InfoPill tone="sky">{t('signals.pictureHeld')}</InfoPill>
        )}
        {theCase.isSafeguarding && <InfoPill tone="plum">{t('signals.safeguarding')}</InfoPill>}
        {theCase.source === 'report' && (
          <InfoPill tone={theCase.reporterUnder18 ? 'gold' : 'neutral'}>
            {t(theCase.reporterUnder18 ? 'signals.reporterUnder18' : 'signals.adultReporters')}
          </InfoPill>
        )}
      </div>
    </div>
  );
}
