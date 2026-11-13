/**
 * ClassPointsSettingsCard: the teacher turns class points on or off in the class's settings
 * (bundle CLASS-POINTS, part 1; story S1-E8-16 criterion 1: off for every new class until the
 * teacher turns them on).
 *
 * What it shows: what class points are (the weekly budget, the cap for one chapter, that totals
 * stay with the teacher and there is no ranking), whether they are on, the button to change that
 * and, while on, the link to the table.
 * Who shows it: SpaceSettingsPage, for the teacher of a class space.
 * What it calls: useClassPointsSummary → class_points_summary(); useSetClassPoints →
 * set_class_points(), which writes the change to the class's log.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import type { ClassPointsSummary } from '../api/classPoints';
import { useClassPointsSummary, useSetClassPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** What the switch's controls need. */
interface SwitchControlsProps {
  slug: string;
  summary: ClassPointsSummary;
  isRunning: boolean;
  onChange: (isOn: boolean) => void;
}

/**
 * The button that turns points on or off (a line instead in an archived class) and, while they
 * are on, the link to the table.
 *
 * @returns the controls
 */
function SwitchControls({ slug, summary, isRunning, onChange }: SwitchControlsProps) {
  const { t } = useClassPointsTranslation();
  return (
    <>
      {summary.canSwitch ? (
        <Button
          variant={summary.isEnabled ? 'secondary' : 'primary'}
          className="self-start"
          disabled={isRunning}
          onClick={() => onChange(!summary.isEnabled)}
        >
          {summary.isEnabled ? t('settings.turnOff') : t('settings.turnOn')}
        </Button>
      ) : (
        <p className="m-0 text-body">{t('settings.archived')}</p>
      )}
      {summary.isEnabled && (
        <Link to={`/spaces/${slug}/points`} className="w-fit font-semibold text-link underline">
          {t('card.openTable')}
        </Link>
      )}
    </>
  );
}

/**
 * Renders the card.
 *
 * @param props.slug - the class's address
 * @returns the card, or nothing until the summary has loaded
 */
export function ClassPointsSettingsCard({ slug }: { slug: string }) {
  const { t } = useClassPointsTranslation();
  const read = useClassPointsSummary(slug);
  const switcher = useSetClassPoints(slug);
  const [isSaved, setIsSaved] = useState(false);
  const summary = read.data;
  if (summary === undefined || summary === null) return null;

  /** Turns points on or off, then says so. */
  async function change(isOn: boolean) {
    setIsSaved(false);
    const changed = await switcher.change(isOn).catch(() => undefined);
    if (changed !== undefined) setIsSaved(true);
  }

  return (
    <section
      aria-labelledby="class-points-settings-heading"
      className="flex w-full max-w-[760px] flex-col gap-3 rounded-[28px] border border-border bg-surface p-6"
    >
      <Eyebrow>{t('settings.eyebrow')}</Eyebrow>
      <h2
        id="class-points-settings-heading"
        className="m-0 font-heading text-2xl font-bold text-heading"
      >
        {t('settings.title')}
      </h2>
      <p className="m-0 text-body">
        {t('settings.intro', { budget: summary.budget, cap: summary.cap })}
      </p>
      <p className="m-0 font-semibold text-ink">
        {summary.isEnabled ? t('settings.isOn') : t('settings.isOff')}
      </p>
      <SwitchControls
        slug={slug}
        summary={summary}
        isRunning={switcher.isRunning}
        onChange={change}
      />
      <div aria-live="polite">
        {switcher.failure !== null && (
          <Notice tone="error">{t(`failures.${switcher.failure.failure}`)}</Notice>
        )}
        {isSaved && switcher.failure === null && (
          <Notice tone="success">{t('settings.saved')}</Notice>
        )}
      </div>
    </section>
  );
}
