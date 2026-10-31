/**
 * AgeNumbersCards: "Sign-ups by age group" and "Age checks" on the staff Metrics page (story
 * S1-E11-04, criterion 1; board AdminMetrics).
 *
 * Sign-ups are counted from the year of birth and shown as groups only, never the year
 * (architecture 1.8.3). Age checks are results only: no photo or document is ever kept (CLAUDE.md
 * rule 5). "Appealed" shows "not counted yet" until manual checks exist (S1-E2-08, after March).
 * Every number is real text in a label and value tile. Who shows it: MetricsOverviewSections.
 */
import { useTranslation } from 'react-i18next';

import type { AgeCheckNumbers, SignUpsByAge } from '../../api/metricsOverview';

import { MetricsCard } from './MetricsCard';

/** One tile: a label and its number (or a short text when there is no number). */
interface Tile {
  label: string;
  value: string;
}

/**
 * The tiles in a row (two per row on phones).
 *
 * @param props.tiles - the labels and values
 * @returns the description list
 */
function NumberTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-1 rounded-card bg-tint p-3">
          <dt className="text-sm text-meta">{tile.label}</dt>
          <dd className="m-0 font-heading text-[26px] font-bold text-heading">{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Renders both cards side by side on wide screens.
 *
 * @param props.signUps - sign-ups by age group
 * @param props.ageChecks - how the age checks ended
 * @returns the two cards
 */
export function AgeNumbersCards({
  signUps,
  ageChecks,
}: {
  signUps: SignUpsByAge;
  ageChecks: AgeCheckNumbers;
}) {
  const { t, i18n } = useTranslation('staff');
  const number = (value: number) => value.toLocaleString(i18n.language);
  const appealed =
    ageChecks.appealed === null ? t('metrics.overview.notCountedYet') : number(ageChecks.appealed);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MetricsCard
        headingId="metrics-sign-ups"
        eyebrow={t('metrics.overview.signUpsEyebrow')}
        heading={t('metrics.overview.signUpsHeading')}
        intro={t('metrics.overview.signUpsIntro', { count: signUps.total })}
      >
        <NumberTiles
          tiles={[
            {
              label: t('metrics.overview.ageGroups.13_to_15'),
              value: number(signUps.thirteenToFifteen),
            },
            {
              label: t('metrics.overview.ageGroups.16_to_17'),
              value: number(signUps.sixteenToSeventeen),
            },
            {
              label: t('metrics.overview.ageGroups.18_plus'),
              value: number(signUps.eighteenOrOver),
            },
            { label: t('metrics.overview.ageGroups.notGiven'), value: number(signUps.notGiven) },
          ]}
        />
        <p className="m-0 text-[13px] text-meta">{t('metrics.overview.signUpsNote')}</p>
      </MetricsCard>
      <MetricsCard
        headingId="metrics-age-checks"
        eyebrow={t('metrics.overview.ageChecksEyebrow')}
        heading={t('metrics.overview.ageChecksHeading')}
        intro={t('metrics.overview.ageChecksIntro')}
      >
        <NumberTiles
          tiles={[
            { label: t('metrics.overview.ageChecks.passed'), value: number(ageChecks.passed) },
            { label: t('metrics.overview.ageChecks.failed'), value: number(ageChecks.failed) },
            { label: t('metrics.overview.ageChecks.appealed'), value: appealed },
            {
              label: t('metrics.overview.ageChecks.notFinished'),
              value: number(ageChecks.notFinished),
            },
          ]}
        />
        <p className="m-0 text-[13px] text-meta">{t('metrics.overview.ageChecksNote')}</p>
      </MetricsCard>
    </div>
  );
}
