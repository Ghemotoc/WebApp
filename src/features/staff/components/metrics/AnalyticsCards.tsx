/**
 * AnalyticsCards: "Cookieless analytics" and "Event catalogue" on the staff Metrics page (stories
 * S1-E15-01, S1-E15-03 and S1-E11-04; board AdminMetrics; ADR 0007).
 *
 * The first says whether the app sends events and to which tool; it is off until Robert chooses
 * Plausible or Umami (Q49 is OPEN) and the build has the tool's address. Top events stay in that
 * tool's own dashboard: we keep no copy (docs/board-fixes.md). The second counts the event names
 * in the code; a unit test fails the build when one isn't in docs/analytics-events.md.
 * Who shows it: MarchNumbersPage. What it reads: lib/analytics (no database call).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';
import { analyticsEventNames } from '@/lib/analytics/catalogue';
import { analyticsConfigFrom } from '@/lib/analytics/track';

import { MetricsCard } from './MetricsCard';

/** The tools' names as people write them. */
const providerNames = { plausible: 'Plausible', umami: 'Umami' };

/**
 * Renders both cards.
 *
 * @returns the two cards side by side on wide screens
 */
export function AnalyticsCards() {
  const { t } = useTranslation('staff');
  const config = analyticsConfigFrom(import.meta.env);
  const status =
    config.provider === 'off'
      ? t('metrics.analytics.off')
      : t('metrics.analytics.on', { provider: providerNames[config.provider] });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MetricsCard
        headingId="metrics-analytics"
        eyebrow={t('metrics.analytics.eyebrow')}
        heading={t('metrics.analytics.heading')}
      >
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          <li>
            <InfoPill tone="sage">{t('metrics.analytics.noCookies')}</InfoPill>
          </li>
          <li>
            <InfoPill tone="sage">{t('metrics.analytics.noIds')}</InfoPill>
          </li>
          <li>
            <InfoPill tone="sage">{t('metrics.analytics.eu')}</InfoPill>
          </li>
        </ul>
        <p className="m-0 text-sm text-ink">{status}</p>
        <p className="m-0 text-[13px] text-meta">{t('metrics.analytics.topEvents')}</p>
      </MetricsCard>
      <MetricsCard
        headingId="metrics-catalogue"
        eyebrow={t('metrics.analytics.catalogueEyebrow')}
        heading={t('metrics.analytics.catalogueHeading')}
      >
        <p className="m-0 text-sm text-body">{t('metrics.analytics.catalogueBody')}</p>
        <p className="m-0 text-sm text-ink">
          {t('metrics.analytics.catalogueCount', { count: analyticsEventNames.length })}
        </p>
      </MetricsCard>
    </div>
  );
}
