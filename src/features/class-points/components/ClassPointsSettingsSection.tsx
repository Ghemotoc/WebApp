/**
 * ClassPointsSettingsSection: "Settings" at the foot of the teacher's class points page (bundle
 * BOOKS-8, part 8b; board G09-ClassPoints, user story 8.9: "the Class points switch (off for every
 * new class) and the weekly numbers").
 *
 * What it shows: the Class points switch in its box, then three label and value rows: points a
 * week for each pupil, most points to one chapter in a week, and when the week starts (Monday at
 * 00:00, Romanian time). An archived class shows the switch's state but can't change it.
 * Who shows it: ClassPointsPage, for the class's teacher.
 * What it calls: useClassPointsSummary → class_points_summary(); useSetClassPoints →
 * set_class_points(), which writes the change to the class's log.
 */
import { useId } from 'react';

import { LabelRows } from '@/components/ui/LabelRows';
import { Notice } from '@/components/ui/Notice';
import { Switch } from '@/components/ui/Switch';

import { useClassPointsSummary, useSetClassPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/**
 * Renders the section.
 *
 * @param props.slug - the class's address
 * @returns the section, or nothing until the summary has loaded or for anyone but the teacher
 */
export function ClassPointsSettingsSection({ slug }: { slug: string }) {
  const { t } = useClassPointsTranslation();
  const hintId = useId();
  const summary = useClassPointsSummary(slug).data;
  const switcher = useSetClassPoints(slug);
  if (summary === undefined || summary === null || summary.role !== 'teacher') return null;

  return (
    <section aria-labelledby="class-points-settings" className="flex flex-col gap-3">
      <h2 id="class-points-settings" className="m-0 type-heading">
        {t('pointsSettings.title')}
      </h2>
      <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-4">
        <div className="flex min-w-0 flex-col">
          <span className="type-label text-ink-heading">{t('pointsSettings.switchLabel')}</span>
          <span id={hintId} className="type-meta">
            {t('pointsSettings.switchHint')}
          </span>
        </div>
        <Switch
          label={t('pointsSettings.switchLabel')}
          isOn={summary.isEnabled}
          isDisabled={!summary.canSwitch || switcher.isRunning}
          describedBy={hintId}
          onToggle={() => void switcher.change(!summary.isEnabled).catch(() => undefined)}
        />
      </div>
      <div aria-live="polite">
        {switcher.failure !== null && (
          <Notice tone="error">{t(`failures.${switcher.failure.failure}`)}</Notice>
        )}
      </div>
      <LabelRows
        look="spread"
        rows={[
          { label: t('pointsSettings.perWeek'), value: summary.budget },
          { label: t('pointsSettings.perChapter'), value: summary.cap },
          { label: t('pointsSettings.weekStarts'), value: t('pointsSettings.weekStartsValue') },
        ]}
      />
    </section>
  );
}
