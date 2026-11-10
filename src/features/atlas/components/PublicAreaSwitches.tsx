/**
 * PublicAreaSwitches: "What readers can see", the five area switches (story S1-E17-32: "when I
 * turn on an area (Characters, Relationship map, Family tree, Story bible, Timeline), then that
 * area shows with the story once it is published").
 *
 * A glass card of rows (board AtlasReaders, G10c4): the area's name and a line on what it shares
 * on the left, an on and off switch on the right. A press saves at once, and the switch shows the
 * writer's choice until the save answers. Turning one off takes it away from readers at once
 * (every public answer reads the switches live).
 * Who uses it: ReaderViewPage. What it calls: the save it is given (usePlanVisibility) and the
 * shared SwitchButton.
 */
import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { SwitchButton } from '@/features/settings/components/SwitchButton';

import { planAreas, type PlanArea } from '../api/publicPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the switches need. */
export interface PublicAreaSwitchesProps {
  savedAreas: PlanArea[];
  /** Saves every area readers should see; throws when it can't. */
  save: (areas: PlanArea[]) => Promise<void>;
}

/**
 * Renders the switches.
 *
 * @returns the fieldset
 */
export function PublicAreaSwitches({ savedAreas, save }: PublicAreaSwitchesProps) {
  const { t } = useAtlasTranslation();
  const [pending, setPending] = useState<PlanArea[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const areas = pending ?? savedAreas;

  /** Turns one area on or off and saves them all. */
  async function toggle(area: PlanArea, isOn: boolean) {
    const next = isOn ? [...areas, area] : areas.filter((open) => open !== area);
    setHasFailed(false);
    setPending(next);
    await save(next).catch(() => setHasFailed(true));
    setPending(null);
  }

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface px-5 py-5 shadow-card md:px-7">
      <legend className="float-left mb-2 font-heading text-[22px] font-bold text-heading">
        {t('readers.areas.legend')}
      </legend>
      {planAreas.map((area) => (
        <div
          key={area}
          className="flex min-h-11 w-full items-center justify-between gap-4 border-t border-hairline py-3 first-of-type:border-t-0"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold text-heading">{t(`publicPlan.areas.${area}`)}</span>
            <span className="text-sm text-body">{t(`readers.areas.hints.${area}`)}</span>
          </div>
          <SwitchButton
            label={t(`publicPlan.areas.${area}`)}
            isOn={areas.includes(area)}
            stateWord={t(areas.includes(area) ? 'readers.areas.on' : 'readers.areas.off')}
            isDisabled={false}
            onToggle={() => void toggle(area, !areas.includes(area))}
          />
        </div>
      ))}
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('readers.item.saveFailed')}</Notice>}
      </div>
    </fieldset>
  );
}
