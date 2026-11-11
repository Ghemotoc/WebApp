/**
 * InvestorLatestCard: the last night's active members and retention on the staff Metrics page
 * (story S1-E15-04, bundle ANALYTICS-1a; research doc "Research: reading analytics and
 * suggestions").
 *
 * Retention is rolling: the share of a day's new members who came back on that day or later, and
 * it is empty for a day on which fewer than 5 members joined (the small-number rule).
 * Who shows it: InvestorNumbersSection. Plain components (staff screens).
 */
import { useTranslation } from 'react-i18next';

import { LabelRows } from '@/components/ui/LabelRows';

import type { InvestorLatest } from '../../api/investorNumbers';

import { MetricsCard } from './MetricsCard';

/**
 * Renders the card.
 *
 * @param props.latest - the last night's numbers
 * @param props.actions - the download buttons
 * @returns the card
 */
export function InvestorLatestCard({
  latest,
  actions,
}: {
  latest: InvestorLatest;
  actions: React.ReactNode;
}) {
  const { t, i18n } = useTranslation('staff');
  const count = (value: number | null) =>
    value === null ? t('metrics.investor.notCounted') : value.toLocaleString(i18n.language);
  const share = (value: number | null) =>
    value === null
      ? t('metrics.investor.tooFew')
      : t('metrics.investor.percent', { value: value.toLocaleString(i18n.language) });
  return (
    <MetricsCard
      headingId="metrics-investor-latest"
      eyebrow={t('metrics.investor.eyebrow')}
      heading={t('metrics.investor.latestHeading')}
      intro={t('metrics.investor.latestIntro')}
      actions={actions}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <LabelRows
          rows={[
            { label: t('metrics.investor.daily'), value: count(latest.activeMembers) },
            { label: t('metrics.investor.weekly'), value: count(latest.weeklyActiveMembers) },
            { label: t('metrics.investor.monthly'), value: count(latest.monthlyActiveMembers) },
          ]}
        />
        <LabelRows
          rows={[
            { label: t('metrics.investor.retention1'), value: share(latest.retentionDay1) },
            { label: t('metrics.investor.retention7'), value: share(latest.retentionDay7) },
            { label: t('metrics.investor.retention30'), value: share(latest.retentionDay30) },
          ]}
        />
      </div>
    </MetricsCard>
  );
}
