/**
 * PlacementGrid: every ad slot on every public page against the next six weeks (story S1-E12-05
 * criterion 1; board AdminSponsors "Slot inventory, next 6 weeks").
 *
 * Each cell says Booked (with the sponsor and campaign), House ad, Ad network or Free. "Preview
 * with the ad network on" shows what the free wide slots would become once the network is
 * switched on; it changes nothing on the server. The table scrolls inside its own labelled box
 * (keyboard focusable), so the page never scrolls sideways on a phone.
 * Who shows it: PlacementsSection. What it calls: lib/placementWords.ts; the section passes the
 * inventory.
 */
import { useState } from 'react';

import { Chip } from '@/components/ui/Chip';
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import type { AdPlacements, PlacementSlot, PlacementWeek } from '@/schemas/adPlacements';

import { shownState } from '../../../lib/placementWords';
import { sponsorDayInWords } from '../../../lib/sponsorWords';
import { useSponsorTranslation } from '../../../registerSponsorTranslations';

/** The pill colour of each state (board AdminSponsors: plum, sky, neutral, sage). */
const stateTones: Record<PlacementWeek['state'], PillTone> = {
  booked: 'plum',
  house: 'sky',
  network: 'neutral',
  free: 'sage',
};

/** One cell: the state's pill and, under it, who or what fills it. */
function WeekCell({ week, state }: { week: PlacementWeek; state: PlacementWeek['state'] }) {
  const { t } = useSponsorTranslation();
  // Step 1: the line under the pill names the booking or the house ad, when there is one.
  let what = '';
  if (state === 'booked') what = `${week.sponsor_name ?? ''} · ${week.campaign_name ?? ''}`;
  else if (state === 'house') what = week.house_title ?? '';
  else what = t(`inventory.what.${state}`);
  return (
    <td className="border-t border-hairline px-3 py-2.5 align-top">
      <div className="flex flex-col items-start gap-1">
        <InfoPill tone={stateTones[state]}>{t(`inventory.states.${state}`)}</InfoPill>
        <span className="text-[13px] break-words text-body">{what}</span>
      </div>
    </td>
  );
}

/** One row: the slot's name and page, then its six weeks. */
function SlotRow({ slot, isPreviewOn }: { slot: PlacementSlot; isPreviewOn: boolean }) {
  const { t } = useSponsorTranslation();
  return (
    <tr>
      <th scope="row" className="border-t border-hairline px-3 py-2.5 text-left align-top">
        <span className="block font-semibold text-heading">
          {t(`inventory.slots.${slot.slot_key}`)}
        </span>
        <span className="block text-[13px] font-normal text-meta">
          {t(`inventory.formats.${slot.format}`)}
          {!slot.is_on && ` · ${t('inventory.slotOff')}`}
        </span>
      </th>
      {slot.weeks.map((week) => (
        <WeekCell
          key={week.week_start}
          week={week}
          state={shownState(week, slot.format, isPreviewOn)}
        />
      ))}
    </tr>
  );
}

/**
 * Renders the preview chip and the table.
 *
 * @param props.placements - the inventory from admin_ad_placements()
 * @returns the grid
 */
export function PlacementGrid({ placements }: { placements: AdPlacements }) {
  const { t, i18n } = useSponsorTranslation();
  // The preview starts on when the network really is on, so it shows the truth by default.
  const [isPreviewOn, setIsPreviewOn] = useState(placements.network_ready);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-meta">
          {t('inventory.slotCount', { count: placements.slots.length })}{' '}
          {placements.network_ready ? t('inventory.networkOn') : t('inventory.networkOff')}
        </p>
        <Chip isPressed={isPreviewOn} onPressedChange={setIsPreviewOn}>
          {t('inventory.preview')}
        </Chip>
      </div>
      <div
        className="overflow-x-auto rounded-2xl border border-hairline"
        role="region"
        aria-label={t('inventory.gridHeading')}
        tabIndex={0}
      >
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <caption className="sr-only">{t('inventory.gridHeading')}</caption>
          <thead>
            <tr className="text-left text-meta">
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t('inventory.slotColumn')}
              </th>
              {placements.weeks.map((monday) => (
                <th key={monday} scope="col" className="px-3 py-2.5 font-semibold">
                  {t('inventory.weekOf', { day: sponsorDayInWords(monday, i18n.language) })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {placements.slots.map((slot) => (
              <SlotRow key={slot.slot_key} slot={slot} isPreviewOn={isPreviewOn} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
