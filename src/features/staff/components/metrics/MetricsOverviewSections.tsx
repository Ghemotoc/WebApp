/**
 * MetricsOverviewSections: the live numbers under the March targets on the staff Metrics page:
 * sign-ups by age group, age checks and reports by tier (story S1-E11-04, criterion 1; board
 * AdminMetrics).
 *
 * Who shows it: MarchNumbersPage, once the owner or an admin has the March numbers.
 * What it calls: useMetricsOverview → api/metricsOverview.ts → admin_metrics_overview().
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import { useMetricsOverview } from '../../hooks/useMetricsOverview';

import { AgeNumbersCards } from './AgeNumbersCards';
import { TierNumbersTable } from './TierNumbersTable';

/**
 * Renders the sections, a wait line or the error.
 *
 * @returns the sections
 */
export function MetricsOverviewSections() {
  const { t } = useTranslation('staff');
  const { overview, failure } = useMetricsOverview();
  if (failure !== null) return <Notice tone="error">{t('metrics.overview.unreachable')}</Notice>;
  if (overview === null) return <p className="m-0 text-meta">{t('metrics.loading')}</p>;
  return (
    <>
      <AgeNumbersCards signUps={overview.signUpsByAge} ageChecks={overview.ageChecks} />
      <TierNumbersTable tiers={overview.casesByTier} windowDays={overview.tierWindowDays} />
    </>
  );
}
