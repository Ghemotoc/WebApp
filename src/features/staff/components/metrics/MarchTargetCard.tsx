/**
 * MarchTargetCard: one of the three March test numbers with its target (story S1-E15-02; board
 * AdminMetrics, "March test targets").
 *
 * Board values: a white card, the label as an eyebrow, the number in Funnel Display at 40 px, an 8 px
 * gold progress bar on a lilac track, "Target 20 · 70% of the way" and a line saying what is
 * counted. The bar is a real progressbar with its label, so a screen reader hears the progress.
 * Who uses it: MarchNumbersPage.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';

import { progressTowards } from '../../lib/marchNumbers';

/** What one card shows. */
export interface MarchTargetCardProps {
  label: string;
  /** The number, or null before the job has counted it. */
  value: number | null;
  target: number;
  /** "%" for the return rate, empty for counts. */
  unit: string;
  /** What is counted, in one line. */
  description: string;
  /** Anything to show beside the label, for example the "Approximation" pill. */
  badge?: ReactNode;
}

/**
 * Renders the card.
 *
 * @returns the card
 */
export function MarchTargetCard({
  label,
  value,
  target,
  unit,
  description,
  badge,
}: MarchTargetCardProps) {
  const { t, i18n } = useTranslation('staff');
  const progress = progressTowards(value, target);
  const formatted = value === null ? t('metrics.notYet') : value.toLocaleString(i18n.language);
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Eyebrow>{label}</Eyebrow>
        {badge}
      </div>
      <p className="m-0 font-heading text-[40px] leading-none font-bold text-heading">
        {formatted}
        {value !== null && unit}
      </p>
      <div
        role="progressbar"
        aria-label={t('metrics.progressLabel', { label })}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-tint"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
      </div>
      <p className="m-0 text-sm font-semibold text-heading">
        {t('metrics.target', {
          target: `${target.toLocaleString(i18n.language)}${unit}`,
          progress,
        })}
      </p>
      <p className="m-0 text-[13px] leading-normal text-meta">{description}</p>
    </div>
  );
}
