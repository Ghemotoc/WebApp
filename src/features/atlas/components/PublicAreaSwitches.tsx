/**
 * PublicAreaSwitches: "Areas readers see", the five area switches on "What readers can see"
 * (story S1-E17-32: "when I turn on an area (Characters, Relationship map, Family tree, Story
 * bible, Timeline), then that area shows with the story once it is published"; redrawn by user
 * stories bundle 6, story 6.14, board E33: "An area that's on shows on the story page under
 * Shared by the writer").
 *
 * A section between hairlines, as board E33 draws it: the heading, a line on where an area shows,
 * then a hairline row per area, its name and a line on what it shares on the left and its switch
 * on the right. The switch's position and fill say on or off, and screen readers hear its state,
 * so no word sits beside it (as drawn). A press saves at once, and the switch shows the writer's
 * choice until the save answers; turning one off takes it away from readers at once (every
 * public answer reads the switches live).
 * Who uses it: ReaderViewPage. What it calls: the save it is given (usePlanVisibility), Switch
 * and AtlasSection.
 */
import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { Switch } from '@/components/ui/Switch';

import { planAreas, type PlanArea } from '../api/publicPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasSection } from './AtlasSection';

/** What the switches need. */
export interface PublicAreaSwitchesProps {
  savedAreas: PlanArea[];
  /** Saves every area readers should see; throws when it can't. */
  save: (areas: PlanArea[]) => Promise<void>;
}

/** One area's row: its name and line, and its switch. */
function AreaRow({
  area,
  isOn,
  onToggle,
}: {
  area: PlanArea;
  isOn: boolean;
  onToggle: () => void;
}) {
  const { t } = useAtlasTranslation();
  const hintId = `atlas-reader-area-${area}-hint`;
  return (
    <li className="flex min-h-11 items-center justify-between gap-4 border-t border-hairline py-3">
      <div className="flex min-w-0 flex-col">
        <span className="type-label font-semibold text-ink-heading">
          {t(`readers.areas.names.${area}`)}
        </span>
        <span id={hintId} className="type-meta text-ink-muted">
          {t(`readers.areas.hints.${area}`)}
        </span>
      </div>
      <Switch
        label={t(`readers.areas.names.${area}`)}
        isOn={isOn}
        describedBy={hintId}
        onToggle={onToggle}
      />
    </li>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading, its line and the five rows
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
    <AtlasSection id="atlas-reader-areas" heading={t('readers.areas.legend')}>
      <p className="m-0 -mt-2 max-w-none type-meta text-ink-muted">{t('readers.areas.hint')}</p>
      <ul aria-label={t('readers.areas.legend')} className="m-0 flex list-none flex-col p-0">
        {planAreas.map((area) => (
          <AreaRow
            key={area}
            area={area}
            isOn={areas.includes(area)}
            onToggle={() => void toggle(area, !areas.includes(area))}
          />
        ))}
      </ul>
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('readers.item.saveFailed')}</Notice>}
      </div>
    </AtlasSection>
  );
}
